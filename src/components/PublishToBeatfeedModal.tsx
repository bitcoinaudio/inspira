import React, { useState } from 'react';

interface PublishToBeatfeedModalProps {
  packId: string;
  packTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

const PublishToBeatfeedModal: React.FC<PublishToBeatfeedModalProps> = ({
  packId,
  packTitle,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    creator_handle: 'bitcoinaudio',
    price_sats: 0,
    visibility: 'public',
    auto_publish: true,
    beatfeed_url: '/beatfeed-api',
    use_tunnel: true  // Use Cloudflare tunnel for remote publishing
  });

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      setSuccess(false);

      // Get manifest URL from SamplePacker
      // Use tunnel URL for remote beatfeed.xyz, or host.docker.internal for local Docker
      const manifestUrl = formData.use_tunnel
        ? `https://samplepacker.bitcoinaudio.co/api/packs/${packId}/manifest`
        : `http://host.docker.internal:3003/api/packs/${packId}/manifest`;

      // Publish to Beatfeed (always use proxy to avoid CORS)
      const beatfeedUrl = '/beatfeed-api';
      const response = await fetch(`${beatfeedUrl}/admin/publish-from-manifest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': localStorage.getItem('beatfeed_admin_key') || ''
        },
        body: JSON.stringify({
          creator_handle: formData.creator_handle,
          manifest_url: manifestUrl,
          price_sats: parseInt(formData.price_sats.toString()),
          visibility: formData.visibility,
          auto_publish: formData.auto_publish
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to publish: ${response.statusText}`);
      }

      const publishResult = await response.json();
      setResult(publishResult);
      setSuccess(true);

      // Save admin key for next time
      if (localStorage.getItem('beatfeed_admin_key')) {
        // Already saved
      }

      if (onSuccess) {
        onSuccess(publishResult);
      }

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Publish to Beatfeed</h3>
                {packTitle && <p className="text-sm text-base-content/70 mt-1">{packTitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="btn btn-ghost btn-xs btn-circle"
              >
                ✕
              </button>
            </div>

            {success ? (
              // Success Message
              <div className="space-y-4">
                <div className="alert alert-success">
                  <svg className="stroke-current shrink-0 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Published to Beatfeed! 🎉</span>
                </div>

                {result && (
                  <div className="space-y-2 text-sm">
                    <p><strong>Product:</strong> {result.slug}</p>
                    <p><strong>Status:</strong> {result.status}</p>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary block"
                      >
                        View on Beatfeed →
                      </a>
                    )}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="btn btn-primary w-full"
                >
                  Close
                </button>
              </div>
            ) : (
              // Form
              <div className="space-y-4">
                {error && (
                  <div className="alert alert-error">
                    <svg className="stroke-current shrink-0 h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Form Fields */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Creator Handle</span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered"
                    value={formData.creator_handle}
                    onChange={(e) => setFormData({ ...formData, creator_handle: e.target.value })}
                    disabled={isPublishing}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Price (sats)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={formData.price_sats}
                    onChange={(e) => setFormData({ ...formData, price_sats: parseInt(e.target.value) || 0 })}
                    disabled={isPublishing}
                    min="0"
                  />
                  <label className="label">
                    <span className="label-text-alt">Set to 0 for free collection</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Visibility</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                    disabled={isPublishing}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text">Auto-publish immediately</span>
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={formData.auto_publish}
                      onChange={(e) => setFormData({ ...formData, auto_publish: e.target.checked })}
                      disabled={isPublishing}
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text">
                      Publish to beatfeed.xyz
                      <span className="badge badge-success badge-sm ml-2">LIVE</span>
                    </span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-success"
                      checked={formData.use_tunnel}
                      onChange={(e) => setFormData({ ...formData, use_tunnel: e.target.checked })}
                      disabled={isPublishing}
                    />
                  </label>
                  <p className="text-xs text-base-content/50 pl-1">
                    {formData.use_tunnel 
                      ? '🌐 Publishing to live beatfeed.xyz (requires tunnel running)'
                      : '🏠 Publishing to local Docker beatfeed'}
                  </p>
                </div>

                {/* Admin Key Setup */}
                <details className="collapse collapse-arrow border border-base-300">
                  <summary className="collapse-title text-sm font-medium">
                    Admin Key Setup
                  </summary>
                  <div className="collapse-content space-y-2 text-sm">
                    <p>Enter your Beatfeed admin key to publish:</p>
                    <input
                      type="password"
                      placeholder="Enter admin key"
                      className="input input-bordered input-sm w-full"
                      defaultValue={localStorage.getItem('beatfeed_admin_key') || ''}
                      onChange={(e) => localStorage.setItem('beatfeed_admin_key', e.target.value)}
                    />
                    <p className="text-xs text-base-content/50">
                      Key is saved in your browser localStorage
                    </p>
                  </div>
                </details>

                {/* Footer */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={onClose}
                    className="btn btn-ghost flex-1"
                    disabled={isPublishing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    className="btn btn-primary flex-1"
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Publishing...
                      </>
                    ) : (
                      '🚀 Publish'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PublishToBeatfeedModal;
