"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (signatureData: string, notes?: string) => Promise<void>;
  title: string;
  notesRequired?: boolean;
}

export default function SignatureModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  notesRequired = false,
}: SignatureModalProps) {
  const t = useTranslations("signoffs");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [notes, setNotes] = useState("");

  // Initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing styles
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with white background
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasSignature(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!hasSignature) {
      throw new Error(t("signatureRequired"));
    }

    if (notesRequired && !notes.trim()) {
      throw new Error(t("notesRequired"));
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get signature as base64
    const signatureData = canvas.toDataURL("image/png");

    await onSubmit(signatureData, notes.trim() || undefined);
  };

  const handleClose = () => {
    clearSignature();
    setNotes("");
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
      formId="signature-form"
      onSubmit={handleSubmit}
      successMessage={t("signSuccess")}
      errorFallbackMessage={t("signError")}
      submitDisabled={!hasSignature || (notesRequired && !notes.trim())}
      submitLabel={t("submit")}
    >
      <div className="space-y-4">
        {/* Signature Canvas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("signature")} <span className="text-red-500">*</span>
          </label>
          <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-48 cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
            />
          </div>
          <button
            type="button"
            onClick={clearSignature}
            className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            {t("clearSignature")}
          </button>
        </div>

        {/* Notes */}
        <FormInput
          id="notes"
          label={t("notes")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={4}
          maxLength={1000}
          required={notesRequired}
          hint={t("notesHint", { count: 1000 - notes.length })}
        />
      </div>
    </BaseModal>
  );
}
