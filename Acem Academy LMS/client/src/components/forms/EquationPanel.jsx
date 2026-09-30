import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { X, Sigma } from "lucide-react";

/*
|--------------------------------------------------------------------------
| Token Groups
|--------------------------------------------------------------------------
|
| Two kinds of token:
|   - Plain symbols (Symbols / Greek tabs): clicking just inserts the
|     `latex` string at the cursor.
|   - Structure templates (Structures tab): clicking inserts a LaTeX
|     template with empty {} placeholders, e.g. "\frac{}{}", and moves
|     the cursor INSIDE the first placeholder so the teacher can type
|     straight into it. `cursorBack` is how many characters back from
|     the end of the inserted string the cursor should land.
|
*/

const SYMBOLS = [
    "\\pm", "\\infty", "=", "\\neq", "\\sim", "\\times", "\\div", "!",
    "\\propto", "<", "\\leq", ">", "\\geq", "\\mp", "\\cong", "\\approx",
    "\\equiv", "\\forall", "\\in", "\\notin", "\\partial", "\\sqrt{}",
    "\\cup", "\\cap", "\\emptyset", "\\%", "\\degree", "\\Delta", "\\nabla",
    "\\exists", "\\nexists", "\\ni", "\\leftarrow", "\\rightarrow",
    "\\uparrow", "\\downarrow", "\\sum", "\\int", "\\oint", "\\prod",
];

const GREEK = [
    "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\zeta",
    "\\eta", "\\theta", "\\iota", "\\kappa", "\\lambda", "\\mu", "\\nu",
    "\\xi", "\\pi", "\\rho", "\\sigma", "\\tau", "\\phi", "\\chi", "\\psi",
    "\\omega", "\\Gamma", "\\Delta", "\\Theta", "\\Lambda", "\\Xi", "\\Pi",
    "\\Sigma", "\\Phi", "\\Psi", "\\Omega",
];

const STRUCTURES = [
    { label: "Fraction", insert: "\\frac{}{}", cursorBack: 3 },
    { label: "Superscript", insert: "^{}", cursorBack: 1 },
    { label: "Subscript", insert: "_{}", cursorBack: 1 },
    { label: "Radical", insert: "\\sqrt{}", cursorBack: 1 },
    { label: "nth Root", insert: "\\sqrt[n]{}", cursorBack: 1 },
    { label: "Integral", insert: "\\int_{}^{}", cursorBack: 4 },
    { label: "Large Sum", insert: "\\sum_{}^{}", cursorBack: 4 },
    { label: "Large Product", insert: "\\prod_{}^{}", cursorBack: 4 },
    { label: "Bracket ( )", insert: "\\left(\\right)", cursorBack: 7 },
    { label: "Bracket [ ]", insert: "\\left[\\right]", cursorBack: 7 },
    { label: "sin", insert: "\\sin()", cursorBack: 1 },
    { label: "cos", insert: "\\cos()", cursorBack: 1 },
    { label: "tan", insert: "\\tan()", cursorBack: 1 },
    { label: "log", insert: "\\log_{}()", cursorBack: 3 },
    { label: "ln", insert: "\\ln()", cursorBack: 1 },
    { label: "Hat", insert: "\\hat{}", cursorBack: 1 },
    { label: "Vector", insert: "\\vec{}", cursorBack: 1 },
    { label: "Bar", insert: "\\bar{}", cursorBack: 1 },
    { label: "Dot", insert: "\\dot{}", cursorBack: 1 },
    { label: "Limit", insert: "\\lim_{x \\to }", cursorBack: 1 },
    { label: "2\u00d72 Matrix", insert: "\\begin{matrix} & \\\\ & \\end{matrix}", cursorBack: 0 },
];

const TABS = ["Symbols", "Greek", "Structures"];

/*
|--------------------------------------------------------------------------
| EquationPanel
|--------------------------------------------------------------------------
|
| Controlled modal. Parent owns whether this is a NEW equation or an
| EDIT of an existing one - this component only knows the starting
| latex/mode and reports back via onInsert(latex, mode) or onCancel().
|
| Props:
|   initialLatex - prefill (empty string for a brand-new equation)
|   initialMode  - "inline" | "block"
|   onCancel()
|   onInsert(latex, mode)
|
*/

function EquationPanel({ initialLatex = "", initialMode = "inline", allowBlock = true, onCancel, onInsert }) {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [latex, setLatex] = useState(initialLatex);
    const [mode, setMode] = useState(allowBlock ? initialMode : "inline");
    const [renderError, setRenderError] = useState(false);
    const textareaRef = useRef(null);
    const previewRef = useRef(null);

    useEffect(() => {
        const el = previewRef.current;
        if (!el) return;

        if (!latex.trim()) {
            el.innerHTML = "";
            setRenderError(false);
            return;
        }

        try {
            katex.render(latex, el, { throwOnError: true, displayMode: mode === "block" });
            setRenderError(false);
        } catch {
            setRenderError(true);
        }
    }, [latex, mode]);

    const insertAtCursor = (snippet, cursorBack = 0) => {
        const el = textareaRef.current;
        const start = el?.selectionStart ?? latex.length;
        const end = el?.selectionEnd ?? latex.length;
        const next = latex.slice(0, start) + snippet + latex.slice(end);

        setLatex(next);

        requestAnimationFrame(() => {
            if (!el) return;
            el.focus();
            const cursor = start + snippet.length - cursorBack;
            el.setSelectionRange(cursor, cursor);
        });
    };

    const handleInsert = () => {
        if (!latex.trim()) {
            onCancel();
            return;
        }
        onInsert(latex.trim(), mode);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Sigma size={18} className="text-slate-500" />
                        <h3 className="text-lg font-semibold text-slate-900">Equation</h3>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 px-5">
                    <div className="flex gap-5 text-sm">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`border-b-2 py-2.5 font-medium transition ${
                                    activeTab === tab
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Token grid */}
                <div className="max-h-48 overflow-y-auto px-5 py-4">
                    {activeTab === "Structures" ? (
                        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                            {STRUCTURES.map((token) => (
                                <button
                                    key={token.label}
                                    type="button"
                                    onClick={() => insertAtCursor(token.insert, token.cursorBack)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-[11px] font-medium leading-tight text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                    title={token.insert}
                                >
                                    {token.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                            {(activeTab === "Symbols" ? SYMBOLS : GREEK).map((sym) => (
                                <button
                                    key={sym}
                                    type="button"
                                    onClick={() => insertAtCursor(sym)}
                                    className="flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                    title={sym}
                                >
                                    <SymbolPreview latex={sym} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* LaTeX input */}
                <div className="border-t border-slate-200 px-5 pt-4">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        LaTeX
                    </label>
                    <textarea
                        ref={textareaRef}
                        value={latex}
                        onChange={(event) => setLatex(event.target.value)}
                        rows={2}
                        placeholder="Type LaTeX directly, or click symbols above \u2014 e.g. \\frac{a}{b}"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                </div>

                {/* Live preview */}
                <div className="px-5 pb-1 pt-4">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Preview
                    </label>
                    <div className="flex min-h-[64px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        {latex.trim() ? (
                            renderError ? (
                                <span className="text-xs text-red-500">Can't render this LaTeX yet \u2014 keep typing</span>
                            ) : (
                                <span ref={previewRef} className="text-lg" />
                            )
                        ) : (
                            <span className="text-xs text-slate-400">Nothing to preview</span>
                        )}
                    </div>
                </div>

                {/* Footer: inline/block toggle + actions */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                    {allowBlock ? (
                        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                onClick={() => setMode("inline")}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    mode === "inline" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                                }`}
                            >
                                Inline
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("block")}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                    mode === "block" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                                }`}
                            >
                                Display (block)
                            </button>
                        </div>
                    ) : (
                        <span className="text-xs text-slate-400">Inserted as inline equation</span>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleInsert}
                            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                        >
                            Insert
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| SymbolPreview
|--------------------------------------------------------------------------
|
| Renders one Symbols/Greek token via KaTeX so the button shows the
| actual glyph rather than raw LaTeX source (e.g. shows "\u00b1" instead
| of the text "\pm").
|
*/

function SymbolPreview({ latex }) {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;
        try {
            katex.render(latex, ref.current, { throwOnError: false });
        } catch {
            ref.current.textContent = latex;
        }
    }, [latex]);

    return <span ref={ref} />;
}

export default EquationPanel;