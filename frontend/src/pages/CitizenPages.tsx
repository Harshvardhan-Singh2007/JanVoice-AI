import { isAxiosError } from "axios";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IssueCard } from "../components/citizen/IssueCard";
import { Icon } from "../components/ui/Icon";
import { checkPotentialDuplicates, createIssue, getIssueMapMarkers, getMyIssues, getMyIssueStatistics, type ApiIssue, type IssueMapMarker, type MyIssueStatistics, type PotentialDuplicate } from "../features/issues/issueApi";
import {
  analyzeComplaint,
  type AiComplaintAnalysis,
} from "../features/ai/aiApi";
import type { IssuePriority } from "../types/issue";
import { IssueMap } from "../components/citizen/IssueMap";
import { Timeline } from "../components/citizen/Timeline";
import { appendRecognizedText, getSpeechRecognitionConstructor, speechRecognitionErrorMessage, type SpeechRecognitionLike, type SpeechRecognitionWindow } from "../features/voice/speechRecognition";

const issueCategories = [
  "Sanitation",
  "Roads",
  "Water",
  "Street Lighting",
  "Public Safety",
];
const priorityFromAi: Record<AiComplaintAnalysis["priority"], IssuePriority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function CitizenHome() {
  const [reports, setReports] = useState<ApiIssue[]>([]);
  const [statistics, setStatistics] = useState<MyIssueStatistics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapMarkers, setMapMarkers] = useState<IssueMapMarker[]>([]);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ApiIssue>();

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getMyIssues(), getMyIssueStatistics()])
      .then(([issues, counts]) => {
        if (!active) return;
        setReports(issues);
        setStatistics(counts);
        setError("");
      })
      .catch(() => {
        if (active) setError("Unable to load your reports right now. Please try again.");
      })
      .finally(() => { if (active) setLoading(false); });
    getIssueMapMarkers().then((markers) => {
      if (active) {
        setMapMarkers(markers);
        setMapUnavailable(false);
      }
    }).catch(() => {
      if (active) {
        setMapMarkers([]);
        setMapUnavailable(true);
      }
    });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">
            Citizen dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your civic reports.
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Submit a report, review its current status, and read updates recorded in JAN Voice AI.
          </p>
        </div>
        <Link
          to="/dashboard/citizen/report"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
        >
          <Icon name="mic" className="h-4 w-4" />
          Report an issue
        </Link>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="My Reports" value={statistics?.total} loading={loading} icon="tracking" />
        <Stat label="Pending" value={statistics?.pending} loading={loading} icon="route" />
        <Stat label="In Progress" value={statistics?.inProgress} loading={loading} icon="route" />
        <Stat label="Resolved" value={statistics?.resolved} loading={loading} icon="check" />
      </div>
      {loading && <p role="status" className="mt-5 text-sm text-slate-500">Loading your civic reports…</p>}
      {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button onClick={() => setRefreshKey((key) => key + 1)} className="font-bold underline">Retry</button></div>}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent reports</h2>
          <Link
            to="/dashboard/citizen/reports"
            className="text-sm font-bold text-cyan-600"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {!loading && !error && reports.slice(0, 2).map((report) => (
            <IssueCard key={report._id} issue={report} onTrack={setSelectedReport} />
          ))}
          {loading && <p role="status" className="text-sm text-slate-500">Loading your reports...</p>}
          {!loading && !error && reports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
              No reports yet. Submit a report to begin tracking updates here.
            </div>
          )}
        </div>
      </section>
      <IssueMap markers={mapMarkers} unavailable={mapUnavailable} />
      {selectedReport && <section className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[.04]"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-cyan-700">Report status</p><h2 className="mt-1 font-bold">{selectedReport.title}</h2><p className="mt-1 text-sm text-slate-500">{selectedReport.status} · {selectedReport._id}</p></div><button onClick={() => setSelectedReport(undefined)} className="text-sm font-bold text-slate-500">Close</button></div><Timeline issue={selectedReport} /></section>}
    </div>
  );
}
function Stat({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value?: number;
  loading: boolean;
  icon: "tracking" | "route" | "check";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]">
      <Icon name={icon} className="h-5 w-5 text-cyan-600" />
      <p className="mt-5 text-3xl font-bold">{loading || value === undefined ? '—' : value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function ReportIssuePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Sanitation",
    location: "",
    priority: "Medium" as IssuePriority,
    emergency: false,
  });
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiComplaintAnalysis>();
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const aiRequestInFlight = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastElement = useRef<HTMLDivElement | undefined>(undefined);
  const [aiSummary, setAiSummary] = useState("");
  const [aiReviewState, setAiReviewState] = useState<"accepted" | "edited" | "rejected">();
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const speechRecognizer = useRef<SpeechRecognitionLike | undefined>(undefined);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [locationStatus, setLocationStatus] = useState("");
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }) as typeof current);
    if ((key === "category" || key === "priority") && analysis && aiReviewState === "accepted") setAiReviewState("edited");
    if (key === "title" || key === "description" || key === "category") {
      setDuplicates([]);
      setDuplicateMessage("");
    }
  };
  const setComplaintDescription = (value: string) => {
    update("description", value.slice(0, 5000));
    setAnalysis(undefined);
    setAiSummary("");
    setAiReviewState(undefined);
  };
  const startVoiceInput = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor(window as unknown as SpeechRecognitionWindow);
    if (!SpeechRecognition) {
      setVoiceStatus("Voice input is not supported in this browser. You can type your report instead.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = navigator.language || "en-IN";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = Array.from({ length: event.results.length - event.resultIndex }, (_, index) => event.results[event.resultIndex + index]?.[0]?.transcript ?? "").join(" ").trim();
        if (transcript) {
          setForm((current) => ({ ...current, description: appendRecognizedText(current.description, transcript) }));
          setAnalysis(undefined);
          setAiSummary("");
          setAiReviewState(undefined);
          setDuplicates([]);
          setVoiceStatus("Transcript added. Review and edit it in the description field.");
        }
      };
      recognition.onerror = (event) => {
        setVoiceStatus(speechRecognitionErrorMessage(event.error));
      };
      recognition.onend = () => {
        setVoiceListening(false);
        speechRecognizer.current = undefined;
      };
      speechRecognizer.current = recognition;
      recognition.start();
      setVoiceListening(true);
      setVoiceStatus("Listening. Speak clearly, then review the transcript.");
    } catch {
      setVoiceListening(false);
      setVoiceStatus("Microphone access is unavailable. You can type your report instead.");
    }
  };
  const stopVoiceInput = () => speechRecognizer.current?.stop();
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location sharing is not supported by this browser. You can continue without GPS.");
      return;
    }
    setLocationStatus("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(({ coords: position }) => {
      if (!Number.isFinite(position.latitude) || !Number.isFinite(position.longitude)
        || position.latitude < -90 || position.latitude > 90 || position.longitude < -180 || position.longitude > 180) {
        setLocationStatus("The browser returned an invalid location. Continue without GPS.");
        return;
      }
      setCoordinates({ latitude: position.latitude, longitude: position.longitude });
      setDuplicates([]);
      setDuplicateMessage("");
      setLocationStatus("GPS location attached to this report. It will be shown approximately on the map.");
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was denied. You can continue without GPS."
        : "Current location could not be read. You can continue without GPS.";
      setLocationStatus(message);
    }, { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 });
  };
  const runDuplicateCheck = async () => {
    if (checkingDuplicates) return;
    if (form.title.trim().length < 5 || form.description.trim().length < 15) {
      setDuplicateMessage("Add a title and description before checking for similar reports.");
      return;
    }
    setCheckingDuplicates(true);
    setDuplicateMessage("");
    try {
      const matches = await checkPotentialDuplicates({
        title: form.title,
        description: form.description,
        category: form.category,
        ...(coordinates ? { coordinates } : {}),
      });
      setDuplicates(matches);
      setDuplicateMessage(matches.length ? "These reports may describe a similar issue. Your report will still be submitted separately." : "No similar reports were found.");
    } catch {
      setDuplicateMessage("Similar report check is unavailable. You can still submit your report.");
      setDuplicates([]);
    } finally {
      setCheckingDuplicates(false);
    }
  };
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastElement.current?.remove();
    },
    [],
  );
  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  useEffect(() => () => speechRecognizer.current?.stop(), []);
  const showToast = (message: string, type: "success" | "error") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const element = toastElement.current ?? document.createElement("div");
    element.setAttribute("role", "status");
    element.className = `fixed right-5 top-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${type === "success" ? "bg-emerald-600" : "bg-rose-600"}`;
    element.textContent = message;
    document.body.appendChild(element);
    toastElement.current = element;
    toastTimer.current = window.setTimeout(() => {
      element.remove();
      toastElement.current = undefined;
    }, 4000);
  };
  const analyzeWithAi = async () => {
    if (aiLoading || aiRequestInFlight.current || analysis) return;
    if (form.description.trim().length < 10) {
      const message =
        "Enter at least 10 characters in the description before using AI analysis.";
      setAiError(message);
      showToast(message, "error");
      return;
    }
    setAiError("");
    aiRequestInFlight.current = true;
    setAiLoading(true);
    try {
      const result = await analyzeComplaint(form.description);
      if (!result.available) {
        setAnalysis(undefined);
        setAiError(result.message);
        return;
      }
      setAnalysis(result);
      setAiSummary(result.summary);
      setAiReviewState(undefined);
      setAiError("");
      showToast("AI suggestions are ready for your review.", "success");
    } catch {
      const message =
        "Unable to analyze this complaint right now. Please try again.";
      setAiError(message);
      showToast(message, "error");
    } finally {
      aiRequestInFlight.current = false;
      setAiLoading(false);
    }
  };
  const applyAiSuggestions = () => {
    if (!analysis) return;
    setForm((current) => ({
      ...current,
      category: analysis.category,
      priority: priorityFromAi[analysis.priority],
    }));
    setAiSummary(analysis.summary);
    setAiReviewState("accepted");
    setAiError("");
    showToast(
      "AI suggestions applied. Review the form before submitting.",
      "success",
    );
  };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!supportedTypes.has(file.type)) {
      setImageFile(undefined);
      setImagePreview(undefined);
      setImageError("Choose a JPG, JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageFile(undefined);
      setImagePreview(undefined);
      setImageError("Image upload must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageError("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      form.title.trim().length < 5 ||
      form.description.trim().length < 15 ||
      !form.location.trim()
    ) {
      const message =
        "Please add a clear title, detailed description, and location.";
      setError(message);
      showToast(message, "error");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await createIssue({
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        location: form.location,
        emergency: form.emergency,
        image: imageFile,
        ...(coordinates ? { coordinates } : {}),
        ...(analysis && aiReviewState ? {
          analysisToken: analysis.analysisToken,
          aiReviewState,
          ...(aiReviewState !== "rejected" ? { aiSummary } : {}),
        } : {}),
      });
      navigate("/dashboard/citizen/reports", {
        replace: true,
        state: { success: "Report submitted successfully." },
      });
    } catch (requestError) {
      const apiMessage = isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message
        : undefined;
      const message = apiMessage ?? "Unable to submit your report. Please try again.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const categoryOptions = issueCategories.some(
    (category) => category === form.category,
  )
    ? issueCategories
    : [form.category, ...issueCategories];
  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">
          New civic report
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Report an issue
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Describe the issue clearly. AI suggestions are optional, and staff assignment happens within this platform.
        </p>
      </div>
      <form onSubmit={submit} className="mt-8 max-w-4xl space-y-6">
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04] sm:p-7">
            <label className="text-sm font-bold">
                Issue title
              <input
                  required
                  minLength={5}
                  maxLength={160}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Garbage collection missed on Park Street"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <label className="text-sm font-bold">
                Issue description
              <textarea
                required
                minLength={15}
                value={form.description}
                maxLength={5000}
                onChange={(e) => {
                  setComplaintDescription(e.target.value);
                }}
                placeholder="Describe what happened, when you noticed it, and how it affects the area..."
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <div className="-mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={voiceListening ? stopVoiceInput : startVoiceInput} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-white/15">
                <Icon name="mic" className="h-4 w-4" />{voiceListening ? "Stop voice input" : "Dictate complaint"}
              </button>
              <p role="status" className="text-xs text-slate-500">{voiceStatus || "Voice input is optional. JAN Voice AI receives the editable transcript only; microphone audio is not uploaded or stored by this app."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={analyzeWithAi}
                disabled={aiLoading || Boolean(analysis)}
                className="inline-flex items-center justify-center rounded-xl border border-cyan-500 px-4 py-2.5 text-sm font-bold text-cyan-700 disabled:opacity-70 dark:border-cyan-400 dark:text-cyan-300"
              >
                {aiLoading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Icon name="brain" className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </button>
              {aiError && (
                <p className="text-sm font-semibold text-rose-600">{aiError}</p>
              )}
            </div>
            {analysis && (
              <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-400/20 dark:bg-cyan-400/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon name="brain" className="text-cyan-600" />
                    <h2 className="font-bold">AI generated recommendations</h2>
                  </div>
                  <button
                    type="button"
                    onClick={applyAiSuggestions}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
                  >
                    Accept and apply suggestions
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <AiSuggestion label="Category" value={analysis.category} />
                  <AiSuggestion
                    label="Department"
                    value={analysis.department}
                  />
                  <AiSuggestion label="Priority" value={analysis.priority} />
                  <AiSuggestion label="Language" value={analysis.language} />
                  <AiSuggestion label="Why this recommendation" value={analysis.explanation} />
                </div>
                <div className="mt-4 rounded-xl bg-white p-4 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                    AI suggested summary (separate from your original description)
                  </p>
                  <textarea value={aiSummary} onChange={(event) => {
                    setAiSummary(event.target.value);
                    if (aiReviewState === "accepted") setAiReviewState("edited");
                  }} maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10 dark:bg-slate-900" aria-label="Edit AI suggested summary" />
                  <p className="mt-2 text-xs text-slate-500">Review status: {aiReviewState ?? "Not reviewed"}. AI suggestions do not indicate government acceptance or action.</p>
                  <button type="button" onClick={() => setAiReviewState("rejected")} className="mt-3 text-sm font-bold text-slate-600 underline">Reject AI suggestions and use my own details</button>
                </div>
              </section>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Category
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                >
                  {categoryOptions.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Priority
                <select
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                >
                  {(
                    ["Low", "Medium", "High", "Critical"] as IssuePriority[]
                  ).map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Location or address
                <input
                  required
                  minLength={2}
                  maxLength={250}
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Street, area, city"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={requestCurrentLocation} className="rounded-xl border border-cyan-500 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-300">Share current location (optional)</button>
                {coordinates && <button type="button" onClick={() => {
                  setCoordinates(undefined);
                  setLocationStatus("GPS location removed. You can submit without coordinates.");
                  setDuplicates([]);
                }} className="text-sm font-semibold underline">Remove GPS</button>}
              </div>
              <p role="status" className="mt-2 text-xs text-slate-500">{locationStatus || "JAN Voice AI requests GPS only after you press the button. Address text remains available without GPS."}</p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-bold">Check for similar reports</h2><p className="mt-1 text-xs text-slate-500">Checks complaint text, category, and nearby shared GPS when available. It never merges or blocks reports.</p></div>
              <button type="button" onClick={() => void runDuplicateCheck()} disabled={checkingDuplicates} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60 dark:border-white/15">{checkingDuplicates ? "Checking…" : "Check similar reports"}</button>
            </div>
            {duplicateMessage && <p role="status" className={`mt-3 text-sm ${duplicates.length ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-500"}`}>{duplicateMessage}</p>}
            {duplicates.length > 0 && <ul className="mt-3 space-y-2">{duplicates.map((duplicate) => <li key={duplicate.reference} className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-400/10"><span className="font-bold">Possible match #{duplicate.reference.slice(-6)}</span><span className="ml-2 text-slate-600 dark:text-slate-300">{duplicate.category} · {duplicate.status}{duplicate.distanceMeters !== undefined ? ` · about ${duplicate.distanceMeters} m away` : ""}</span></li>)}</ul>}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04] sm:p-7">
            <h2 className="font-bold">Attachments</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-600 hover:border-cyan-400 dark:border-white/15 dark:text-slate-300">
                <Icon name="map" className="mx-auto h-5 w-5 text-cyan-600" />
                <span className="mt-2 block">Image Upload</span>
                <input
                  onChange={selectImage}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={voiceListening ? stopVoiceInput : startVoiceInput}
                className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-600 hover:border-cyan-400 dark:border-white/15 dark:text-slate-300"
              >
                <Icon name="mic" className="mx-auto h-5 w-5 text-cyan-600" />
                <span className="mt-2 block">{voiceListening ? "Stop Voice Input" : "Dictate Complaint"}</span>
              </button>
            </div>
            {imageError && (
              <p className="mt-3 text-sm font-semibold text-rose-600">
                {imageError}
              </p>
            )}
            {imagePreview && (
              <img
                className="mt-4 h-24 w-24 rounded-xl object-cover"
                src={imagePreview}
                alt="Issue preview"
              />
            )}
          </section>
          <div className="flex flex-wrap gap-5 text-sm font-semibold">
            <label className="flex items-center gap-2 text-rose-600">
              <input
                checked={form.emergency}
                onChange={(e) => update("emergency", e.target.checked)}
                type="checkbox"
                className="accent-rose-500"
              />
              Flag as urgent for staff
            </label>
          </div>
          <p className="-mt-4 text-xs text-slate-500">Your account remains linked so you can track the report. Staff views omit your account name. An urgent flag only highlights the report in this app and does not contact emergency services. GPS sharing remains optional.</p>
          {error && (
            <p className="text-sm font-semibold text-rose-600">{error}</p>
          )}
          <button
            disabled={submitting}
            className="flex min-w-48 items-center justify-center rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white disabled:opacity-70 dark:bg-cyan-500 dark:text-slate-950"
          >
            {submitting ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                Submitting...
              </>
            ) : (
              "Submit issue report"
            )}
          </button>
      </form>
    </div>
  );
}

function AiSuggestion({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
