'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PricingCard } from '@/components/PricingCard'
import { PricingToggle } from '@/components/PricingToggle'
import { useToast } from '@/components/ui/toast'

const faqs = [
  {
    question: 'What happens after free tier?',
    answer: 'After you reach your free tier limits (3 documents or 3 chats per month), you can either wait until the next month for your limits to reset, or upgrade to Pro for unlimited access.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes! You can cancel your Pro subscription at any time. Your subscription will remain active until the end of your current billing period, and you\'ll continue to have access to Pro features until then.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. All documents are encrypted at rest and in transit. We use industry-standard security practices and never share your data with third parties. Your documents are private and secure.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'Free tier supports PDF and TXT files. Pro tier supports PDF, TXT, and DOCX files. We\'re continuously adding support for more formats.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 30-day money-back guarantee for Pro subscriptions. If you\'re not satisfied, contact us within 30 days for a full refund.',
  },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [isAnnual, setIsAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleProUpgrade = async () => {
    // If not authenticated, redirect to register
    if (!session) {
      router.push('/register?redirect=/pricing')
      return
    }

    // Temporarily disabled - Stripe integration coming soon
    showToast({
      variant: 'info',
      title: 'Coming Soon',
      message: 'Stripe integration coming soon - contact us to upgrade',
    })
    return

    // Original Stripe code (commented out until Stripe is configured)
    /*
    setLoading(true)

    try {
      // Create checkout session with tier type
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier: isAnnual ? 'annual' : 'monthly' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      showToast({
        variant: 'error',
        title: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Failed to start checkout. Please try again.',
      })
      setLoading(false)
    }
    */
  }

  const freeFeatures = [
    '3 documents total',
    '3 chats per month',
    'PDF & TXT support',
    'Basic support',
  ]

  const proFeaturesMonthly = [
    'Unlimited documents',
    'Unlimited chats',
    'PDF, TXT, DOCX support',
    'Priority support',
    'Advanced AI models',
    'Export chat history',
  ]

  const proFeaturesAnnual = [
    ...proFeaturesMonthly,
    'Save $40 per year',
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-4xl font-bold sm:text-5xl md:text-6xl"
          >
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-zinc-400"
          >
            Start free, upgrade when you need more
          </motion.p>
        </div>
      </section>

      {/* Pricing Toggle */}
      <PricingToggle isAnnual={isAnnual} onToggle={setIsAnnual} />

      {/* Pricing Cards */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Free Tier */}
            <PricingCard
              tier="free"
              price="$0"
              period="month"
              features={freeFeatures}
              highlighted={false}
              ctaText="Get Started"
              ctaHref="/register"
            />

            {/* Pro Tier */}
            <div className="relative">
              <PricingCard
                tier="pro"
                price={isAnnual ? '$200' : '$20'}
                period={isAnnual ? 'year' : 'month'}
                features={isAnnual ? proFeaturesAnnual : proFeaturesMonthly}
                highlighted={true}
                ctaText={loading ? 'Processing...' : 'Start Free Trial'}
                ctaHref="#"
                onCtaClick={handleProUpgrade}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center text-3xl font-bold sm:text-4xl"
          >
            Frequently Asked Questions
          </motion.h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-zinc-800/50"
                >
                  <span className="font-semibold text-white">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-zinc-400 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 text-zinc-400">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

