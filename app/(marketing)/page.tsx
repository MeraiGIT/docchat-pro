'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Brain, Zap, Shield, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeatureCard } from '@/components/FeatureCard'
import { Hero3D } from '@/components/Hero3D'

const features = [
  {
    icon: Brain,
    title: 'Intelligent Document Analysis',
    description: 'Advanced AI understands context and nuance in your documents, providing accurate and relevant answers.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Responses',
    description: 'Get answers in seconds, not hours. Our optimized AI delivers instant insights from your documents.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your documents are encrypted and secure. We never share your data with third parties.',
  },
]

export default function LandingPage() {
  const { data: session } = useSession()

  return (
    <div className="relative min-h-screen bg-black">
      {/* 3D Hero Background - Behind all content */}
      <Hero3D />

      {/* Hero Section - In front of 3D background */}
      <section className="relative flex min-h-screen items-center justify-center px-4 pt-20 overflow-hidden" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-4xl text-center relative" style={{ zIndex: 20 }}>
          {session && (
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 text-xl text-purple-400"
            >
              Welcome back, {session.user?.name || session.user?.email}!
            </motion.p>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 text-5xl font-bold leading-tight sm:text-6xl md:text-7xl"
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              Chat With Your
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent"
            >
              Documents
            </motion.span>
            <br />
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-white"
            >
              Using AI
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 text-xl text-zinc-400 sm:text-2xl"
          >
            Upload PDFs, ask questions, get instant answers powered by advanced AI
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            {session ? (
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="group">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" className="group">
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative px-4 py-24 z-10">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
              Powerful Features
            </h2>
            <p className="text-xl text-zinc-400">
              Everything you need to work smarter with your documents
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="relative px-4 py-24 z-10">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-12 text-center backdrop-blur-xl"
          >
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Start free, upgrade when you need more
            </h2>
            <p className="mb-8 text-lg text-zinc-400">
              No credit card required. Get started in seconds.
            </p>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                See Pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-zinc-800 px-4 py-12" style={{ zIndex: 10 }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-zinc-400">
              © 2025 DocChat Pro. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-zinc-400 transition-colors hover:text-purple-400"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-400 transition-colors hover:text-purple-400"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

