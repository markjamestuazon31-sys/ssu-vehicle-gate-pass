import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FileImage, Maximize2, X } from 'lucide-react';
import { ApplicationDocuments, StoredImageDocument } from '../types';
import { formatFileSize } from '../utils/image';

const documentDefinitions: Array<{
  key: 'driversLicense' | 'certificateRegistration' | 'officialReceipt';
  label: string;
}> = [
  { key: 'driversLicense', label: "Driver's License" },
  { key: 'certificateRegistration', label: 'Certificate of Registration (CR)' },
  { key: 'officialReceipt', label: 'Official Receipt (OR)' },
];

type SelectedDocument = {
  label: string;
  file: StoredImageDocument;
};

export function ApplicationDocumentsView({
  documents,
}: {
  documents: ApplicationDocuments | null;
}) {
  const [selected, setSelected] = useState<SelectedDocument | null>(null);

  useEffect(() => {
    if (!selected) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selected]);

  if (!documents) {
    return (
      <div className="notice-box">
        <strong>No uploaded document images</strong>
        <p>
          This may be an older application created before document image upload was enabled.
        </p>
      </div>
    );
  }

  const modal = selected ? (
    <div
      className="ssu-doc-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${selected.label} full-screen preview`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          setSelected(null);
        }
      }}
    >
      <div className="ssu-doc-modal__panel">
        <header className="ssu-doc-modal__header">
          <div className="ssu-doc-modal__title-wrap">
            <div className="ssu-doc-modal__icon">
              <FileImage size={20} />
            </div>

            <div>
              <strong>{selected.label}</strong>
              <span>
                {selected.file.width}×{selected.file.height}px
                {' • '}
                {formatFileSize(selected.file.sizeBytes)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="ssu-doc-modal__close"
            aria-label="Close image viewer"
            title="Close"
            onClick={() => setSelected(null)}
          >
            <X size={24} strokeWidth={2.2} />
          </button>
        </header>

        <div className="ssu-doc-modal__stage">
          <img
            src={selected.file.dataUrl}
            alt={`${selected.label} full-screen preview`}
            className="ssu-doc-modal__image"
          />
        </div>

        <footer className="ssu-doc-modal__footer">
          <span>Full-screen document preview</span>
          <span>Press Esc or click outside the viewer to close.</span>
        </footer>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="submitted-documents-grid">
        {documentDefinitions.map(({ key, label }) => {
          const file = documents[key];

          return (
            <article className="submitted-document" key={key}>
              <div className="submitted-document-head">
                <FileImage size={17} />
                <strong>{label}</strong>
              </div>

              {file ? (
                <>
                  <button
                    type="button"
                    className="submitted-document-image-link"
                    title={`View ${label} full screen`}
                    onClick={() => setSelected({ label, file })}
                  >
                    <img
                      src={file.dataUrl}
                      alt={`${label} submitted by applicant`}
                    />

                    <span className="image-zoom-hint">
                      <Maximize2 size={15} />
                      View full screen
                    </span>
                  </button>

                  <div className="submitted-document-meta">
                    <span>
                      <CheckCircle2 size={14} />
                      Uploaded
                    </span>
                    <small>
                      {formatFileSize(file.sizeBytes)} • {file.width}×{file.height}px
                    </small>
                  </div>
                </>
              ) : (
                <div className="missing-document">Not provided</div>
              )}
            </article>
          );
        })}
      </div>

      {typeof document !== 'undefined' && modal
        ? createPortal(modal, document.body)
        : null}
    </>
  );
}
