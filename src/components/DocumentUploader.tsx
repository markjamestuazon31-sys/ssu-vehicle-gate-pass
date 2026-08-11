import { ChangeEvent, useId, useState } from 'react';
import { CheckCircle2, FileImage, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { StoredImageDocument } from '../types';
import { formatFileSize, prepareImageForRealtimeDatabase } from '../utils/image';

interface DocumentUploaderProps {
  label: string;
  description: string;
  value?: StoredImageDocument;
  onChange: (value?: StoredImageDocument) => void;
  required?: boolean;
}

export function DocumentUploader({ label, description, value, onChange, required = false }: DocumentUploaderProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await prepareImageForRealtimeDatabase(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process this image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`document-uploader ${value ? 'has-file' : ''}`}>
      <div className="document-uploader-heading">
        <div className="document-title-row">
          <FileImage size={20} />
          <div><strong>{label}</strong><p>{description}</p></div>
        </div>
        {required && <span className="required-pill">Required</span>}
      </div>

      {value ? (
        <div className="document-preview">
          <img src={value.dataUrl} alt={`${label} preview`} />
          <div className="document-file-info">
            <span className="document-ok"><CheckCircle2 size={16} /> Ready to submit</span>
            <strong>{value.fileName}</strong>
            <small>{formatFileSize(value.sizeBytes)} after compression • {value.width}×{value.height}px</small>
            <div className="document-actions no-print">
              <label className="secondary-btn compact-btn" htmlFor={id}><RefreshCw size={15} /> Replace</label>
              <button type="button" className="danger-text-btn" onClick={() => onChange(undefined)}><Trash2 size={15} /> Remove</button>
            </div>
          </div>
        </div>
      ) : (
        <label className={`upload-dropzone ${busy ? 'is-busy' : ''}`} htmlFor={id}>
          <UploadCloud size={28} />
          <strong>{busy ? 'Preparing image…' : 'Choose photo or take a picture'}</strong>
          <span>JPG, PNG, or WEBP • up to 8 MB before compression</span>
        </label>
      )}

      <input id={id} className="file-input-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={chooseFile} />
      {error && <div className="upload-error">{error}</div>}
    </section>
  );
}
