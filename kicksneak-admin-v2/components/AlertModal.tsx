"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
}

export default function AlertModal({ isOpen, onClose, title, message, type = "info" }: AlertModalProps) {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow CSS transition to work
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setIsRendered(false), 300); // match transition duration
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className={`modal-overlay ${isVisible ? "open" : ""}`} onClick={onClose}>
      <div 
        className={`modal-content glass-card ${isVisible ? "open" : ""}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          <X size={18} />
        </button>
        
        <div className="modal-header">
          {type === "success" && <CheckCircle2 size={28} className="text-success" />}
          {type === "error" && <AlertCircle size={28} className="text-danger" />}
          {type === "warning" && <AlertCircle size={28} className="text-warning" />}
          {type === "info" && <AlertCircle size={28} className="text-primary" />}
          <h3>{title || (type === "success" ? "Succes!" : type === "error" ? "Eroare!" : "Atenție")}</h3>
        </div>
        
        <div className="modal-body">
          <p>{message}</p>
        </div>
        
        <div className="modal-footer">
          <button className={`btn btn-${type === 'error' ? 'danger' : 'primary'} btn-block`} onClick={onClose}>
            Am înțeles
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .modal-overlay.open {
          opacity: 1;
        }

        .modal-content {
          width: 90%;
          max-width: 400px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          transform: translateY(20px) scale(0.95);
          opacity: 0;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .modal-content.open {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .modal-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #fff;
        }

        .text-success { color: #22c55e; }
        .text-danger { color: #ef4444; }
        .text-warning { color: #f59e0b; }
        .text-primary { color: var(--primary-color); }

        .modal-body p {
          color: var(--text-dim);
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0 0 1.5rem 0;
        }

        .modal-footer {
          width: 100%;
        }

        .btn-block {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
