import { isAxiosError } from "axios";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IssueCard } from "../components/citizen/IssueCard";
import { Timeline } from "../components/citizen/Timeline";
import { Icon } from "../components/ui/Icon";
import { issueStorage } from "../features/issues/issueStorage";
import { createIssue } from "../features/issues/issueApi";
import {
  analyzeComplaint,
  type AiComplaintAnalysis,
} from "../features/ai/aiApi";
import type { AiAnalysis, Issue, IssuePriority } from "../types/issue";

const analysisFor = (
  title: string,
  category: string,
  priority: IssuePriority,
): AiAnalysis => ({
  category:
    category ||
    (title.toLowerCase().includes("garbage")
      ? "Sanitation"
      : "Civic Infrastructure"),
  priorityScore:
    priority === "Critical"
      ? 91
      : priority === "High"
        ? 78
        : priority === "Medium"
          ? 62
          : 35,
  severityScore:
    priority === "Critical"
      ? 9
      : priority === "High"
        ? 7
        : priority === "Medium"
          ? 5
          : 3,
  department:
    category === "Roads"
      ? "Public Works Department"
      : category === "Water"
        ? "Water Supply Board"
        : "Municipal Corporation",
  eta:
    priority === "Critical"
      ? "24 Hours"
      : priority === "High"
        ? "2 Days"
        : "3 Days",
  confidence: 95,
  improvedComplaint: `A civic issue has been reported regarding ${title.toLowerCase()}. The concerned authority is requested to inspect the location and take appropriate action at the earliest.`,
});
void analysisFor;

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
  const reports = issueStorage.reports();
  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-cyan-600">
            Citizen dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Make your city work better.
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Your reports help turn local concerns into visible change.
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
      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        <Stat label="My Reports" value={reports.length} icon="tracking" />
        <Stat
          label="In Progress"
          value={
            reports.filter((report) => report.status === "In Progress").length
          }
          icon="route"
        />
        <Stat
          label="Resolved"
          value={
            reports.filter((report) => report.status === "Resolved").length
          }
          icon="check"
        />
      </div>
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
          {reports.slice(0, 2).map((report) => (
            <IssueCard key={report.id} issue={report} />
          ))}
          {reports.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
              No reports yet. Your voice can start the change.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: "tracking" | "route" | "check";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04]">
      <Icon name={icon} className="h-5 w-5 text-cyan-600" />
      <p className="mt-5 text-3xl font-bold">{value}</p>
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
    pincode: "",
    landmark: "",
    priority: "Medium" as IssuePriority,
    anonymous: false,
    emergency: false,
  });
  const [imageFile, setImageFile] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiComplaintAnalysis>();
  const [issue] = useState<Issue>();
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const aiRequestInFlight = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);
  const toastElement = useRef<HTMLDivElement | undefined>(undefined);
  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }) as typeof current);
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
    if (aiLoading || aiRequestInFlight.current) return;
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
      setAnalysis(await analyzeComplaint(form.description));
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
      description: analysis.professionalVersion,
      category: analysis.category,
      priority: priorityFromAi[analysis.priority],
    }));
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
        anonymous: form.anonymous,
        emergency: form.emergency,
        image: imageFile,
      });
      issueStorage.addNotification("Report submitted successfully.");
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
          Give us the details. JanVoice AI will help direct it to the right
          place.
        </p>
      </div>
      {!issue ? (
        <form onSubmit={submit} className="mt-8 max-w-4xl space-y-6">
          <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[.04] sm:p-7">
            <label className="text-sm font-bold">
              Issue Title
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Garbage collection missed on Park Street"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <label className="text-sm font-bold">
              Issue Description
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe what happened, when you noticed it, and how it affects the area..."
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={analyzeWithAi}
                disabled={aiLoading}
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
                    <h2 className="font-bold">AI suggestions</h2>
                  </div>
                  <button
                    type="button"
                    onClick={applyAiSuggestions}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
                  >
                    Apply AI Suggestions
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
                </div>
                <div className="mt-4 rounded-xl bg-white p-4 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                    Professional version
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                    {analysis.professionalVersion}
                  </p>
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
                Location
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Street, area, city"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                />
              </label>
              <label className="text-sm font-bold">
                Pincode
                <input
                  value={form.pincode}
                  onChange={(e) => update("pincode", e.target.value)}
                  placeholder="6-digit pincode"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                />
              </label>
            </div>
            <label className="text-sm font-bold">
              Landmark
              <input
                value={form.landmark}
                onChange={(e) => update("landmark", e.target.value)}
                placeholder="Nearby landmark (optional)"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
              />
            </label>
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
              <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-600 hover:border-cyan-400 dark:border-white/15 dark:text-slate-300">
                <Icon
                  name="tracking"
                  className="mx-auto h-5 w-5 text-cyan-600"
                />
                <span className="mt-2 block">Video Upload</span>
                <input type="file" accept="video/*" className="hidden" />
              </label>
              <button
                type="button"
                className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm font-semibold text-slate-600 hover:border-cyan-400 dark:border-white/15 dark:text-slate-300"
              >
                <Icon name="mic" className="mx-auto h-5 w-5 text-cyan-600" />
                <span className="mt-2 block">Voice Recording</span>
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
            <label className="flex items-center gap-2">
              <input
                checked={form.anonymous}
                onChange={(e) => update("anonymous", e.target.checked)}
                type="checkbox"
                className="accent-cyan-500"
              />
              Anonymous Report
            </label>
            <label className="flex items-center gap-2 text-rose-600">
              <input
                checked={form.emergency}
                onChange={(e) => update("emergency", e.target.checked)}
                type="checkbox"
                className="accent-rose-500"
              />
              Emergency
            </label>
          </div>
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
      ) : (
        <AnalysisResult issue={issue} />
      )}
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

function AnalysisResult({ issue }: { issue: Issue }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 max-w-4xl space-y-6"
    >
      <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
        <p className="font-bold">✓ Report submitted successfully</p>
        <p className="mt-1 text-sm">
          Your issue has been saved and analyzed locally.
        </p>
      </div>
      <section className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-6 dark:border-cyan-400/20 dark:bg-cyan-400/5">
        <div className="flex items-center gap-2">
          <Icon name="brain" className="text-cyan-600" />
          <h2 className="font-bold">AI Analysis</h2>
          <span className="ml-auto text-xs font-bold text-cyan-700 dark:text-cyan-300">
            {issue.analysis.confidence}% confident
          </span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Issue Category", issue.analysis.category],
            ["Priority Score", `${issue.analysis.priorityScore}/100`],
            ["Severity Score", `${issue.analysis.severityScore}/10`],
            ["Department", issue.analysis.department],
            ["Estimated Resolution", issue.analysis.eta],
            ["Confidence", `${issue.analysis.confidence}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-white p-3 dark:bg-slate-900"
            >
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[.04]">
        <h2 className="font-bold">Professional rewrite</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Original complaint
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {issue.description}
            </p>
          </div>
          <span className="grid place-items-center text-cyan-600">↓</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cyan-600">
              AI improved complaint
            </p>
            <p className="mt-2 text-sm leading-6">
              {issue.analysis.improvedComplaint}
            </p>
          </div>
        </div>
      </section>
      <IssueCard issue={issue} />
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[.04]">
        <h2 className="font-bold">Issue timeline</h2>
        <Timeline issue={issue} />
      </section>
      <Link
        to="/dashboard/citizen/reports"
        className="inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-cyan-500 dark:text-slate-950"
      >
        View my reports
      </Link>
    </motion.div>
  );
}
