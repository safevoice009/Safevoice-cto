import { useMemo, useState } from 'react'
import { useStore, type MemorialTribute } from '../../lib/store'
import { sanitizeContent } from '../../lib/utils'
import { redactContactInfo } from '../../lib/privacy/redactContactInfo'

function sanitizeForDisplay(value: string): string {
  return redactContactInfo(sanitizeContent(value))
}

interface EditDraft {
  personName: string
  college: string
  message: string
}

export default function ModeratorPanel() {
  const isModerator = useStore((state) => state.isModerator)
  const tributes = useStore((state) => state.memorialTributes)
  const approveTribute = useStore((state) => state.approveTribute)
  const rejectTribute = useStore((state) => state.rejectTribute)
  const editTribute = useStore((state) => state.editTribute)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const pendingTributes = useMemo(() => {
    return tributes
      .filter((tribute) => tribute.status === 'pending_moderation')
      .filter((tribute) => tribute.cosignerProofs.filter((p) => p.contentHash === tribute.contentHash).length >= 3)
      .sort((a, b) => a.createdAt - b.createdAt)
  }, [tributes])

  if (!isModerator) {
    return null
  }

  const beginEdit = (tribute: MemorialTribute) => {
    setEditingId(tribute.id)
    setEditDraft({
      personName: tribute.personName,
      college: tribute.college ?? '',
      message: tribute.message,
    })
    setEditError(null)
  }

  const handleApprove = async (tributeId: string) => {
    setBusyId(tributeId)
    try {
      await approveTribute(tributeId)
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (tributeId: string) => {
    const reason = rejectionReasons[tributeId] ?? ''
    setBusyId(tributeId)
    try {
      await rejectTribute(tributeId, reason)
    } finally {
      setBusyId(null)
    }
  }

  const handleSaveEdit = async (tributeId: string) => {
    if (!editDraft) return
    setBusyId(tributeId)

    try {
      const result = await editTribute(tributeId, {
        personName: editDraft.personName,
        message: editDraft.message,
        college: editDraft.college,
      })

      if (!result.success) {
        setEditError(result.error ?? 'Unable to save edits.')
        return
      }

      setEditingId(null)
      setEditDraft(null)
      setEditError(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="glass p-6 space-y-4" aria-label="Memorial moderation panel">
      <header className="space-y-1">
        <h2 className="text-xl font-bold text-white">Memorial Moderator Panel</h2>
        <p className="text-sm text-gray-400">Review tributes that have at least 3 cosigners.</p>
      </header>

      {pendingTributes.length === 0 ? (
        <div className="text-gray-300" data-testid="no-pending-tributes">
          No tributes awaiting moderation.
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Pending tributes">
          {pendingTributes.map((tribute) => {
            const validProofs = tribute.cosignerProofs
              .filter((proof) => proof.contentHash === tribute.contentHash)
              .slice()
              .sort((a, b) => a.signedAt - b.signedAt)

            const isEditing = editingId === tribute.id
            const rejectionReason = rejectionReasons[tribute.id] ?? ''

            return (
              <li key={tribute.id} className="bg-surface/40 border border-white/10 rounded-lg p-4 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">{sanitizeForDisplay(tribute.personName)}</h3>
                  {tribute.college && (
                    <p className="text-xs text-gray-400">{sanitizeForDisplay(tribute.college)}</p>
                  )}
                  <p className="text-sm text-gray-200">{sanitizeForDisplay(tribute.message)}</p>
                </div>

                <details className="bg-white/5 border border-white/10 rounded-lg p-3" open>
                  <summary className="cursor-pointer text-sm text-gray-200" aria-label="Cosigner proofs">
                    Cosigner proofs ({validProofs.length})
                  </summary>
                  <ul className="mt-2 space-y-2" aria-label="Cosigner proof list">
                    {validProofs.map((proof) => (
                      <li key={proof.id} className="text-xs text-gray-300">
                        <div>
                          <span className="font-medium">{proof.cosignerId}</span>
                          <span className="text-gray-500"> • {new Date(proof.signedAt).toLocaleString()}</span>
                        </div>
                        <div className="font-mono text-[10px] break-all text-gray-400">
                          {proof.signature}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>

                {isEditing && editDraft ? (
                  <div className="space-y-3" aria-label="Edit tribute form">
                    <div className="space-y-1">
                      <label htmlFor={`edit-name-${tribute.id}`} className="text-xs text-gray-300">
                        Honoree name
                      </label>
                      <input
                        id={`edit-name-${tribute.id}`}
                        value={editDraft.personName}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            personName: e.target.value,
                          })
                        }
                        className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-college-${tribute.id}`} className="text-xs text-gray-300">
                        College
                      </label>
                      <input
                        id={`edit-college-${tribute.id}`}
                        value={editDraft.college}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            college: e.target.value,
                          })
                        }
                        className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor={`edit-message-${tribute.id}`} className="text-xs text-gray-300">
                        Tribute message
                      </label>
                      <textarea
                        id={`edit-message-${tribute.id}`}
                        value={editDraft.message}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            message: e.target.value,
                          })
                        }
                        className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white"
                        rows={4}
                      />
                    </div>

                    {editError && (
                      <p className="text-sm text-red-300" role="alert">
                        {editError}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(tribute.id)}
                        disabled={busyId === tribute.id}
                        className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                        aria-label="Save edits"
                      >
                        Save edits
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setEditDraft(null)
                          setEditError(null)
                        }}
                        disabled={busyId === tribute.id}
                        className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg disabled:opacity-50"
                        aria-label="Cancel edits"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor={`reject-reason-${tribute.id}`} className="block text-xs text-gray-300">
                        Rejection reason
                      </label>
                      <input
                        id={`reject-reason-${tribute.id}`}
                        value={rejectionReason}
                        onChange={(e) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [tribute.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-surface border border-white/10 rounded-lg p-2 text-white"
                        placeholder="Provide a reason..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApprove(tribute.id)}
                        disabled={busyId === tribute.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                        aria-label="Approve tribute"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject(tribute.id)}
                        disabled={busyId === tribute.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                        aria-label="Reject tribute"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => beginEdit(tribute)}
                        disabled={busyId === tribute.id}
                        className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg disabled:opacity-50"
                        aria-label="Edit tribute"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
