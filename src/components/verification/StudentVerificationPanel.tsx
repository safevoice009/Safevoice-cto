import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, Fingerprint, Users, PenSquare, Activity, RefreshCw } from 'lucide-react'
import { useStore, type TrustedContact } from '../../lib/store'
import { useStudentVerificationStore } from '../../lib/identity/studentVerificationState'

const DAY_IN_MS = 1000 * 60 * 60 * 24
const MIN_SIGNATURES = 2
const RECOMMENDED_PEERS = 3
const MAX_PEERS = 5

const formatHash = (hash?: string) => {
  if (!hash) return ''
  if (hash.length <= 10) return hash
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

const safeContacts = (contacts: TrustedContact[] | undefined): TrustedContact[] => {
  if (!Array.isArray(contacts)) {
    return []
  }
  return contacts
}

const statusClass = (variant: 'success' | 'warning' | 'pending') => {
  if (variant === 'success') {
    return 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
  }
  if (variant === 'warning') {
    return 'bg-amber-500/10 text-amber-100 border border-amber-500/20'
  }
  return 'bg-rose-500/10 text-rose-100 border border-rose-500/20'
}

export default function StudentVerificationPanel() {
  const { t } = useTranslation()
  const anonymousWalletAddress = useStore((state) => state.anonymousWalletAddress)
  const trustedContacts = safeContacts(useStore((state) => state.trustedContacts))

  const {
    studentVerification,
    currentRecord,
    pendingPeers,
    submitBiometricCommitment,
    requestPeerVouching,
    submitSelfAttestation,
    refreshStatus,
    isInitialized,
  } = useStudentVerificationStore((state) => ({
    studentVerification: state.studentVerification,
    currentRecord: state.currentRecord,
    pendingPeers: state.pendingPeers,
    submitBiometricCommitment: state.submitBiometricCommitment,
    requestPeerVouching: state.requestPeerVouching,
    submitSelfAttestation: state.submitSelfAttestation,
    refreshStatus: state.refreshStatus,
    isInitialized: state.isInitialized,
  }))

  const [deviceLabel, setDeviceLabel] = useState('')
  const [peerInput, setPeerInput] = useState('')
  const [collegeName, setCollegeName] = useState('')
  const [walletPassword, setWalletPassword] = useState('')
  const [biometricError, setBiometricError] = useState<string | null>(null)
  const [peerError, setPeerError] = useState<string | null>(null)
  const [attestationError, setAttestationError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isRequestingPeers, setIsRequestingPeers] = useState(false)
  const [isAttesting, setIsAttesting] = useState(false)

  const biometricCommitments = currentRecord?.biometricCommitments ?? []
  const peerSignatures = currentRecord?.peerSignatures ?? []

  const signatureCount = useMemo(() => {
    const unique = new Set(peerSignatures.map((sig) => sig.signerWallet))
    return unique.size
  }, [peerSignatures])

  const pendingPeerCount = pendingPeers.length
  const trustedContactCount = trustedContacts.length

  const recommendedTarget = useMemo(() => {
    const base = Math.max(RECOMMENDED_PEERS, pendingPeerCount, trustedContactCount)
    return Math.min(MAX_PEERS, Math.max(base, MIN_SIGNATURES))
  }, [pendingPeerCount, trustedContactCount])

  const progressPercent = recommendedTarget === 0 ? 0 : Math.min(100, (signatureCount / recommendedTarget) * 100)

  const daysRemaining = useMemo(() => {
    if (!studentVerification?.expiresAt) return null
    const diff = studentVerification.expiresAt - Date.now()
    if (diff <= 0) return 0
    return Math.ceil(diff / DAY_IN_MS)
  }, [studentVerification?.expiresAt])

  const peerBadges = useMemo(() => {
    const map = new Map<string, { wallet: string; status: 'pending' | 'signed' | 'expired' }>()
    pendingPeers.forEach((peer) => {
      map.set(peer.walletAddress, { wallet: peer.walletAddress, status: peer.status })
    })
    peerSignatures.forEach((sig) => {
      map.set(sig.signerWallet, { wallet: sig.signerWallet, status: 'signed' })
    })
    return Array.from(map.values()).slice(0, MAX_PEERS)
  }, [pendingPeers, peerSignatures])

  const statusVariant = studentVerification?.isVerified
    ? 'success'
    : studentVerification?.needsReverification
      ? 'warning'
      : 'pending'

  const statusLabel = studentVerification?.isVerified
    ? t('verification.status.verified')
    : studentVerification?.needsReverification
      ? t('verification.status.reverify')
      : t('verification.status.pending')

  const handleCapture = async () => {
    if (!deviceLabel.trim()) {
      setBiometricError(t('verification.errors.deviceLabel'))
      return
    }
    setBiometricError(null)
    setIsCapturing(true)
    try {
      await submitBiometricCommitment(deviceLabel.trim())
      setDeviceLabel('')
    } catch (error) {
      setBiometricError(error instanceof Error ? error.message : t('verification.errors.default'))
    } finally {
      setIsCapturing(false)
    }
  }

  const handleRequestPeers = async () => {
    const addresses = peerInput
      .split(/\n|,/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, MAX_PEERS)

    if (addresses.length === 0) {
      setPeerError(t('verification.errors.peerAddress'))
      return
    }

    setPeerError(null)
    setIsRequestingPeers(true)
    try {
      await requestPeerVouching(addresses)
      setPeerInput('')
    } catch (error) {
      setPeerError(error instanceof Error ? error.message : t('verification.errors.default'))
    } finally {
      setIsRequestingPeers(false)
    }
  }

  const handleAttestation = async () => {
    if (!collegeName.trim()) {
      setAttestationError(t('verification.errors.college'))
      return
    }
    if (!walletPassword) {
      setAttestationError(t('verification.errors.password'))
      return
    }

    setAttestationError(null)
    setIsAttesting(true)
    try {
      await submitSelfAttestation(collegeName.trim(), walletPassword)
      setWalletPassword('')
      await refreshStatus()
    } catch (error) {
      setAttestationError(error instanceof Error ? error.message : t('verification.errors.default'))
    } finally {
      setIsAttesting(false)
    }
  }

  const timelineItems = [
    {
      key: 'biometric',
      label: t('verification.timelineSection.biometric'),
      completed: studentVerification?.hasActiveBiometric ?? false,
      description: biometricCommitments.length
        ? t('verification.timelineSection.hashCount', { count: biometricCommitments.length })
        : t('verification.timelineSection.noData'),
      extra: biometricCommitments.slice(0, 2).map((commitment) => ({
        id: commitment.id,
        label: commitment.deviceLabel,
        value: formatHash(commitment.saltedHash),
      })),
    },
    {
      key: 'peers',
      label: t('verification.timelineSection.peers'),
      completed: studentVerification?.hasPeerVouching ?? false,
      description: signatureCount
        ? t('verification.timelineSection.peerCount', { count: signatureCount })
        : t('verification.peersSection.signaturesNeeded', { count: MIN_SIGNATURES }),
      extra: peerSignatures.slice(0, 3).map((sig) => ({
        id: sig.id,
        label: formatHash(sig.signerWallet),
        value: formatHash(sig.signatureBytes),
      })),
    },
    {
      key: 'attestation',
      label: t('verification.timelineSection.attestation'),
      completed: studentVerification?.hasSelfAttestation ?? false,
      description: studentVerification?.hasSelfAttestation
        ? daysRemaining === 0
          ? t('verification.attestationSection.expired')
          : daysRemaining === null
            ? t('verification.timelineSection.noData')
            : t('verification.attestationSection.countdown', { days: daysRemaining })
        : t('verification.attestationSection.missing'),
      extra: currentRecord?.selfAttestation
        ? [
            {
              id: 'attestation',
              label: currentRecord.selfAttestation.collegeName,
              value: formatHash(currentRecord.selfAttestation.signature),
            },
          ]
        : [],
    },
    {
      key: 'admin',
      label: t('verification.timelineSection.admin'),
      completed: studentVerification?.hasAdminDelegation ?? false,
      description: currentRecord?.adminDelegation
        ? `${formatHash(currentRecord.adminDelegation.adminWallet)} • ${new Date(
            currentRecord.adminDelegation.expiresAt,
          ).toLocaleDateString()}`
        : t('verification.timelineSection.adminMissing'),
      extra: [],
    },
    {
      key: 'expiry',
      label: t('verification.timelineSection.expiry'),
      completed: Boolean(studentVerification?.expiresAt),
      description: studentVerification?.expiresAt
        ? t('verification.timelineSection.expiresOn', {
            date: new Date(studentVerification.expiresAt).toLocaleDateString(),
          })
        : t('verification.timelineSection.noData'),
      extra: [],
    },
  ]

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl border border-white/10 p-6">
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-info" />
              <div>
                <h1 className="text-xl font-semibold text-white">{t('verification.title')}</h1>
                <p className="text-sm text-text-muted">{t('verification.subtitle')}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-text-muted">
              {t('verification.zeroCentralization')}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 tablet:items-end">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass(statusVariant)}`}>
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                void refreshStatus()
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/30"
            >
              <RefreshCw className="h-4 w-4" />
              {t('verification.cta.refresh')}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Fingerprint className="h-5 w-5 text-info" />
              <h2 className="text-lg font-semibold">{t('verification.walletSection.title')}</h2>
            </div>
            <p className="text-sm text-text-muted">{t('verification.walletSection.description')}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass(studentVerification?.hasActiveBiometric ? 'success' : 'pending')}`}>
            {studentVerification?.hasActiveBiometric
              ? t('verification.walletSection.statusActive')
              : t('verification.walletSection.statusMissing')}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-surface/50 p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {t('verification.walletSection.walletLabel')}
            </p>
            <p className="mt-1 font-mono text-sm text-white">
              {anonymousWalletAddress ?? t('verification.walletSection.missingWallet')}
            </p>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t('verification.walletSection.listTitle')}
              </p>
              {biometricCommitments.length === 0 ? (
                <p className="mt-2 text-sm text-text-muted">{t('verification.walletSection.none')}</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {biometricCommitments.slice(0, 3).map((commitment) => (
                    <li key={commitment.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{commitment.deviceLabel}</span>
                        <span className="text-xs text-text-muted">{new Date(commitment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {t('verification.timelineSection.hashLabel')}: {formatHash(commitment.saltedHash)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface/50 p-4">
            <label className="text-sm font-medium text-white" htmlFor="device-label">
              {t('verification.walletSection.deviceLabel')}
            </label>
            <input
              id="device-label"
              type="text"
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
              placeholder={t('verification.walletSection.devicePlaceholder')}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-info focus:outline-none"
            />
            {biometricError && <p className="mt-2 text-sm text-rose-300">{biometricError}</p>}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isCapturing || !anonymousWalletAddress}
              className="mt-3 w-full rounded-lg bg-info/20 px-4 py-2 text-sm font-semibold text-info transition hover:bg-info/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCapturing ? t('common.loading') : t('verification.walletSection.captureCta')}
            </button>
            <p className="mt-3 text-xs text-text-muted">
              {t('verification.walletSection.localOnlyNote')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-info" />
              <h2 className="text-lg font-semibold">{t('verification.peersSection.title')}</h2>
            </div>
            <p className="text-sm text-text-muted">{t('verification.peersSection.description')}</p>
          </div>
          <div className="w-full tablet:w-64">
            <div className="h-2 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full bg-info transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs font-medium text-white">
              {t('verification.peersSection.progressLabel', {
                current: Math.min(signatureCount, recommendedTarget || MIN_SIGNATURES),
                total: recommendedTarget || MIN_SIGNATURES,
              })}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <textarea
              value={peerInput}
              onChange={(event) => setPeerInput(event.target.value)}
              placeholder={t('verification.peersSection.peerTextarea')}
              className="min-h-[140px] w-full rounded-xl border border-white/10 bg-surface/50 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-info focus:outline-none"
            />
            {peerError && <p className="mt-2 text-sm text-rose-300">{peerError}</p>}
            <button
              type="button"
              onClick={handleRequestPeers}
              disabled={isRequestingPeers || !anonymousWalletAddress}
              className="mt-3 w-full rounded-lg bg-info/20 px-4 py-2 text-sm font-semibold text-info transition hover:bg-info/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRequestingPeers ? t('common.loading') : t('verification.peersSection.requestCta')}
            </button>
            <p className="mt-3 text-xs text-text-muted">
              {t('verification.peersSection.shareOffline')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t('verification.peersSection.badgeHeading')}
              </p>
              {peerBadges.length === 0 ? (
                <p className="mt-2 text-sm text-text-muted">{t('verification.peersSection.none')}</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {peerBadges.map((badge) => (
                    <span
                      key={badge.wallet}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        badge.status === 'signed'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          : badge.status === 'pending'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                      }`}
                    >
                      {formatHash(badge.wallet)} • {t(`verification.peersSection.badges.${badge.status}` as const)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {trustedContacts.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-surface/50 p-4">
                <p className="text-sm font-semibold text-white">{t('verification.peersSection.trustedContacts')}</p>
                <ul className="mt-2 space-y-2 text-sm text-text-muted">
                  {trustedContacts.slice(0, MAX_PEERS).map((contact) => (
                    <li key={contact.name} className="flex items-center justify-between">
                      <span className="font-medium text-white">{contact.name}</span>
                      <span className="text-xs text-text-muted">{t('verification.peersSection.offlineOnly')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <PenSquare className="h-5 w-5 text-info" />
              <h2 className="text-lg font-semibold">{t('verification.attestationSection.title')}</h2>
            </div>
            <p className="text-sm text-text-muted">{t('verification.attestationSection.description')}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass(studentVerification?.hasSelfAttestation ? 'success' : 'pending')}`}>
            {studentVerification?.hasSelfAttestation
              ? daysRemaining === 0
                ? t('verification.attestationSection.expired')
                : daysRemaining === null
                  ? t('verification.attestationSection.missing')
                  : t('verification.attestationSection.countdown', { days: daysRemaining })
              : t('verification.attestationSection.missing')}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-white" htmlFor="college-name">
              {t('verification.attestationSection.collegeLabel')}
            </label>
            <input
              id="college-name"
              type="text"
              value={collegeName}
              onChange={(event) => setCollegeName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-info focus:outline-none"
              placeholder={t('verification.attestationSection.collegePlaceholder')}
            />
            <label className="mt-4 block text-sm font-medium text-white" htmlFor="wallet-password">
              {t('verification.attestationSection.passwordLabel')}
            </label>
            <input
              id="wallet-password"
              type="password"
              value={walletPassword}
              onChange={(event) => setWalletPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-info focus:outline-none"
              placeholder={t('verification.attestationSection.passwordHint')}
            />
            {attestationError && <p className="mt-2 text-sm text-rose-300">{attestationError}</p>}
            <button
              type="button"
              onClick={handleAttestation}
              disabled={isAttesting || !anonymousWalletAddress}
              className="mt-3 w-full rounded-lg bg-info/20 px-4 py-2 text-sm font-semibold text-info transition hover:bg-info/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAttesting
                ? t('common.loading')
                : studentVerification?.needsReverification
                  ? t('verification.attestationSection.renewCta')
                  : t('verification.attestationSection.signCta')}
            </button>
            <p className="mt-3 text-xs text-text-muted">{t('verification.attestationSection.passwordHint')}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {t('verification.attestationSection.statementPreview')}
            </p>
            <p className="mt-3 text-sm text-white">
              {`"I am a student at ${collegeName || t('verification.attestationSection.placeholderSchool')}"`}
            </p>
            <p className="mt-3 text-xs text-text-muted">{t('verification.attestationSection.localOnly')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="flex items-center gap-2 text-white">
          <Activity className="h-5 w-5 text-info" />
          <h2 className="text-lg font-semibold">{t('verification.timelineSection.title')}</h2>
        </div>
        <div className="mt-4 space-y-4">
          {timelineItems.map((item) => (
            <div key={item.key} className="flex gap-4">
              <div className={`mt-1 h-3 w-3 rounded-full ${item.completed ? 'bg-info' : 'bg-white/20'}`} />
              <div className="flex-1">
                <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
                  <p className="font-medium text-white">{item.label}</p>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusClass(item.completed ? 'success' : 'pending')}`}>
                    {item.completed ? t('verification.status.verified') : t('verification.status.pending')}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{item.description}</p>
                {item.extra && item.extra.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-text-muted">
                    {item.extra.map((extra) => (
                      <li key={extra.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-1">
                        <span className="font-medium text-white">{extra.label}</span>
                        <span>{extra.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
