"use client";

import { generateToken } from "@/lib/jwttoken";
import { useSession } from "next-auth/react";
import { useState } from "react";

type EnglishSection = "GRAMMAR" | "TRANSLATION";

interface EnglishSectionAreaProps {
  section: EnglishSection;
  label: string;
  disabled?: boolean;
  setMessage: (msg: string) => void;
  onSubmitted?: () => void;
}

export function EnglishSectionArea({
  section,
  label,
  disabled = false,
  setMessage,
  onSubmitted,
}: EnglishSectionAreaProps) {
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !text.trim() || disabled || submitting) return;

    setSubmitting(true);
    const token = generateToken({ user: session.user }, 60 * 2);

    try {
      const blob = new Blob([text], { type: "text/plain" });
      const fileName = section === "GRAMMAR" ? "grammar.txt" : "translation.txt";
      const file = new File([blob], fileName, { type: "text/plain" });

      const formData = new FormData();
      formData.append("section", section);
      formData.append("textfile", file);

      const response = await fetch("/api/submit/english", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data.detail || data.message || response.statusText;
        throw new Error(msg);
      }

      setMessage("Submitted successfully!");
      setText("");
      onSubmitted?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit";
      setMessage(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-violet-50/80 border border-violet-200 rounded-xl">
      <h3 className="text-lg font-semibold text-violet-800 mb-2">{label}</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={`Type your ${label.toLowerCase()} answer here...`}
          className="w-full h-32 p-3 border border-violet-200 rounded-lg bg-white text-gray-800 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-y"
          required
        />
        <button
          type="submit"
          disabled={disabled || submitting || !text.trim()}
          className="mt-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {disabled ? "Already submitted" : submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
