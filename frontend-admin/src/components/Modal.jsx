export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="cm-modal-backdrop" onClick={onClose}>
      <div className="cm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cm-modal-header">
          <h2 className="cm-section-title" style={{ margin: 0 }}>
            {title}
          </h2>
          <button className="cm-modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
