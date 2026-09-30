import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/*
|--------------------------------------------------------------------------
| MathText
|--------------------------------------------------------------------------
|
| Renders a plain string that may contain \( ... \) segments as text with
| those segments KaTeX-rendered inline. Used to preview quiz question/
| option text, which is stored as a plain string (not Tiptap JSON) but can
| still contain equations inserted via EquationPanel.
|
| Splitting is done with a simple non-greedy regex - good enough since the
| only source of \( \) in this text is our own Equation panel, which never
| produces nested/unescaped parens of that exact form.
|
*/

const MATH_SEGMENT = /\\\(([\s\S]*?)\\\)/g;

function MathText({ value, emptyLabel = "Nothing typed yet", className = "", as = "div" }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.innerHTML = "";

        const text = value || "";
        if (!text.trim()) {
            const span = document.createElement("span");
            span.className = "text-slate-400";
            span.textContent = emptyLabel;
            el.appendChild(span);
            return;
        }

        let lastIndex = 0;
        let match;
        MATH_SEGMENT.lastIndex = 0;

        while ((match = MATH_SEGMENT.exec(text)) !== null) {
            if (match.index > lastIndex) {
                el.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }

            const mathSpan = document.createElement("span");
            try {
                katex.render(match[1], mathSpan, { throwOnError: false });
            } catch {
                mathSpan.textContent = match[0];
            }
            el.appendChild(mathSpan);

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            el.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
    }, [value, emptyLabel]);

    const Tag = as;
    return <Tag ref={containerRef} className={className} />;
}

export default MathText;