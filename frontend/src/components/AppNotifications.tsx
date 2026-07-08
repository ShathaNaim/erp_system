"use client";

import { useEffect, useState } from "react";

type AlertEvent = CustomEvent<{ message: string }>;
type ConfirmEvent = CustomEvent<{
  message: string;
  resolve: (confirmed: boolean) => void;
}>;

type AlertState = {
  message: string;
};

type ConfirmState = {
  message: string;
  resolve: (confirmed: boolean) => void;
};

export function showAlert(message: string) {
  window.dispatchEvent(
    new CustomEvent("app-alert", {
      detail: { message },
    })
  );
}

export function showConfirm(message: string) {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app-confirm", {
        detail: { message, resolve },
      })
    );
  });
}

export default function AppNotifications() {
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message?: unknown) => {
      setAlertState({ message: String(message ?? "") });
    };

    function handleAlert(event: Event) {
      const alertEvent = event as AlertEvent;
      setAlertState({ message: alertEvent.detail.message });
    }

    function handleConfirm(event: Event) {
      const confirmEvent = event as ConfirmEvent;
      setConfirmState(confirmEvent.detail);
    }

    window.addEventListener("app-alert", handleAlert);
    window.addEventListener("app-confirm", handleConfirm);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener("app-alert", handleAlert);
      window.removeEventListener("app-confirm", handleConfirm);
    };
  }, []);

  function closeAlert() {
    setAlertState(null);
  }

  function answerConfirm(confirmed: boolean) {
    confirmState?.resolve(confirmed);
    setConfirmState(null);
  }

  const activeMessage = confirmState?.message ?? alertState?.message;
  const isConfirm = Boolean(confirmState);

  if (!activeMessage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f2f50]/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#d8e3ec] bg-white p-6 shadow-[0_24px_70px_rgba(28,43,69,0.22)]">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#e8f7f5] text-[#0f9f94]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-[#1f2f50]">
              {isConfirm ? "Please confirm" : "Notice"}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#34445c]">
              {activeMessage}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {isConfirm && (
            <button
              type="button"
              onClick={() => answerConfirm(false)}
              className="rounded-lg border border-[#d8e3ec] px-4 py-2 text-sm font-semibold text-[#34445c] transition hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={isConfirm ? () => answerConfirm(true) : closeAlert}
            className="rounded-lg bg-[#1f2f50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#162640]"
          >
            {isConfirm ? "Confirm" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
