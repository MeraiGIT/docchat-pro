'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Save, Key, Download, Trash2, ExternalLink, Calendar } from 'lucide-react'
import { SettingsTabs } from '@/components/SettingsTabs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/document-helpers'
import { clsx } from 'clsx'

interface UsageStats {
  chatsCount: number
  chatsLimit: number
  documentsCount: number
  documentsLimit: number
  isPro: boolean
}

interface UsageHistory {
  id: string
  chats_count: number
  documents_count: number
  period_start: string
  period_end: string
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([])
  const [userData, setUserData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  useEffect(() => {
    if (session?.user?.name) {
      setUserData({
        name: session.user.name || '',
        email: session.user.email || '',
      })
    }
    loadUsageData()
  }, [session])

  const loadUsageData = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.usage) {
          setUsage(data.usage)
        }
        if (data.user) {
          setUserData({
            name: data.user.name || '',
            email: data.user.email || '',
          })
        }
      }

      // Load usage history
      const historyResponse = await fetch('/api/usage/history')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setUsageHistory(historyData.history || [])
      }
    } catch (error) {
      console.error('Error loading usage data:', error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!userData.name.trim()) {
      showToast({
        variant: 'error',
        title: 'Validation error',
        message: 'Name is required',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update session
      await update()

      showToast({
        variant: 'success',
        title: 'Profile updated',
        message: 'Your profile has been updated successfully.',
      })
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Update failed',
        message: error instanceof Error ? error.message : 'Failed to update profile',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast({
        variant: 'error',
        title: 'Password mismatch',
        message: 'New passwords do not match',
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      showToast({
        variant: 'error',
        title: 'Invalid password',
        message: 'Password must be at least 8 characters',
      })
      return
    }

    setLoading(true)
    try {
      // Use Supabase to change password
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      showToast({
        variant: 'success',
        title: 'Password changed',
        message: 'Your password has been changed successfully.',
      })

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordDialog(false)
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Password change failed',
        message: error instanceof Error ? error.message : 'Failed to change password',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to open billing portal',
      })
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = window.document.createElement('a')
        a.href = url
        a.download = `docchat-pro-export-${new Date().toISOString().split('T')[0]}.json`
        window.document.body.appendChild(a)
        a.click()
        window.document.body.removeChild(a)
        URL.revokeObjectURL(url)

        showToast({
          variant: 'success',
          title: 'Export successful',
          message: 'Your data has been downloaded.',
        })
      } else {
        throw new Error('Failed to export data')
      }
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Export failed',
        message: 'Failed to export your data. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast({
        variant: 'error',
        title: 'Password required',
        message: 'Please enter your password to confirm',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: deletePassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      showToast({
        variant: 'success',
        title: 'Account deleted',
        message: 'Your account has been deleted successfully.',
      })

      // Sign out and redirect
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Deletion failed',
        message: error instanceof Error ? error.message : 'Failed to delete account',
      })
      setLoading(false)
    }
  }

  const getProgressPercentage = (current: number, limit: number) => {
    if (limit === Infinity) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getNextBillingDate = () => {
    // This would come from Stripe subscription data
    // For now, return placeholder
    return 'N/A'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-zinc-400">Manage your account settings and preferences</p>
      </div>

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Name
                </label>
                <Input
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <Input
                  value={userData.email}
                  disabled
                  className="bg-zinc-800 text-zinc-500"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Email cannot be changed
                </p>
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading} loading={loading}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subscription Tab */}
      {activeTab === 'subscription' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Subscription</h2>
            {usage?.isPro ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">Pro - Active</p>
                    <p className="text-sm text-zinc-400">You have access to all Pro features</p>
                  </div>
                  <div className="rounded-full bg-purple-500/20 px-3 py-1 text-sm font-medium text-purple-400">
                    Pro
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>Next billing date: {getNextBillingDate()}</span>
                  </div>
                </div>
                <Button onClick={handleManageSubscription} disabled={loading} loading={loading}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Manage Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-semibold text-white">Free Tier</p>
                  <p className="text-sm text-zinc-400">Upgrade to unlock unlimited access</p>
                </div>
                {usage && (
                  <div className="space-y-2 text-sm text-zinc-400">
                    <p>Chats: {usage.chatsCount}/{usage.chatsLimit}</p>
                    <p>Documents: {usage.documentsCount}/{usage.documentsLimit}</p>
                  </div>
                )}
                <Button onClick={() => router.push('/pricing')}>
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Current Usage</h2>
            {usage && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Chats this month</span>
                    <span className="text-white">
                      {usage.chatsLimit === Infinity
                        ? 'Unlimited'
                        : `${usage.chatsCount}/${usage.chatsLimit}`}
                    </span>
                  </div>
                  {usage.chatsLimit !== Infinity && (
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        className="h-full bg-purple-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${getProgressPercentage(usage.chatsCount, usage.chatsLimit)}%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Documents</span>
                    <span className="text-white">
                      {usage.documentsLimit === Infinity
                        ? 'Unlimited'
                        : `${usage.documentsCount}/${usage.documentsLimit}`}
                    </span>
                  </div>
                  {usage.documentsLimit !== Infinity && (
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${getProgressPercentage(
                            usage.documentsCount,
                            usage.documentsLimit
                          )}%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
                <p className="pt-4 text-xs text-zinc-500">
                  Usage resets on the first of each month
                </p>
              </div>
            )}
          </div>

          {usageHistory.length > 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Usage History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="pb-2 text-left text-zinc-400">Month</th>
                      <th className="pb-2 text-right text-zinc-400">Chats</th>
                      <th className="pb-2 text-right text-zinc-400">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageHistory.map((record) => (
                      <tr key={record.id} className="border-b border-zinc-800/50">
                        <td className="py-3 text-zinc-300">
                          {formatDate(record.period_start)}
                        </td>
                        <td className="py-3 text-right text-zinc-300">
                          {record.chats_count}
                        </td>
                        <td className="py-3 text-right text-zinc-300">
                          {record.documents_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-lg border border-red-500/50 bg-red-900/10 p-6">
            <h2 className="mb-4 text-xl font-semibold text-red-400">Danger Zone</h2>
            <p className="mb-6 text-sm text-zinc-400">
              These actions are irreversible. Please proceed with caution.
            </p>

            <div className="space-y-4">
              {/* Change Password */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="mb-2 font-semibold text-white">Change Password</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Update your account password
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </Button>
              </div>

              {/* Export Data */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="mb-2 font-semibold text-white">Export Data</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Download all your data as JSON (GDPR compliant)
                </p>
                <Button variant="outline" onClick={handleExportData} disabled={loading}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>

              {/* Delete Account */}
              <div className="rounded-lg border border-red-500/50 bg-red-900/10 p-4">
                <h3 className="mb-2 font-semibold text-red-400">Delete Account</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Password Change Dialog */}
      <ConfirmDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        title="Change Password"
        message="Enter your current password and new password"
        confirmText="Change Password"
        onConfirm={handleChangePassword}
        loading={loading}
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
              placeholder="Current password"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              New Password
            </label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
              placeholder="New password (min 8 characters)"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirmPassword: e.target.value })
              }
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Delete Account Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Account"
        message="This will permanently delete your account and all data. Enter your password to confirm."
        confirmText="Delete Account"
        onConfirm={handleDeleteAccount}
        destructive
        loading={loading}
      >
        <div className="py-4">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Password
          </label>
          <Input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter your password to confirm"
            className="mb-4"
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}

