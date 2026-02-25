"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lines } from "../data";

const cursorBlinkSpeed = 500;
const typingSpeed = 50;
const finalPauseBeforeFading = 1500;
const fadeInterval = 10;
const fadeDuration = 2000;

function Letter() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [typedIndex, setTypedIndex] = useState(0);
  const [linesDisplay, setLinesDisplay] = useState<string[]>([]);
  const [phase, setPhase] = useState<"typing" | "waiting" | "fading" | "done">("typing");
  const [fadeOutIndex, setFadeOutIndex] = useState(0);
  const [removedChars, setRemovedChars] = useState<string[]>([]);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = localStorage.getItem("authenticated") === "true";
    if (!ok) {
      router.push("/");
      return;
    }

    fetch("/api/flag")
      .then((res) => res.json())
      .then((data) => {
        setPhase(data.status === "read" ? "done" : "typing");
      });
  }, [router]);

  const markAsRead = () => {
    fetch("/api/flag", { method: "POST" }).then(() => setPhase("done"));
  };

  useEffect(() => {
    const cursorTimer = setInterval(() => setShowCursor((p) => !p), cursorBlinkSpeed);
    return () => clearInterval(cursorTimer);
  }, []);

  useEffect(() => {
    if (phase !== "done" && phase !== "fading" && scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [linesDisplay, typedIndex, fadeOutIndex, phase]);

  useEffect(() => {
    if (phase === "typing") {
      if (currentLine < lines.length) {
        const currentLineText = lines[currentLine].text;
        if (typedIndex < currentLineText.length) {
          const timer = setTimeout(() => setTypedIndex((p) => p + 1), typingSpeed);
          return () => clearTimeout(timer);
        } else {
          setLinesDisplay((p) => [...p, currentLineText]);
          const timer = setTimeout(() => {
            setCurrentLine((p) => p + 1);
            setTypedIndex(0);
          }, lines[currentLine].pause);
          return () => clearTimeout(timer);
        }
      } else {
        setPhase("waiting");
      }
    }
  }, [phase, currentLine, typedIndex]);

  useEffect(() => {
    if (phase === "waiting") {
      const timer = setTimeout(() => setPhase("fading"), finalPauseBeforeFading);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const getCurrentLinePartial = () => {
    if (phase === "typing") {
      if (currentLine < lines.length) {
        const text = lines[currentLine].text;
        if (typedIndex >= text.length) return "";
        return text.slice(0, typedIndex) + (showCursor ? "_" : "");
      } else return showCursor ? "_" : "";
    }
    return "";
  };

  const combinedTextArray = [...linesDisplay.map((l) => l + "\n"), getCurrentLinePartial()].join("").split("");

  useEffect(() => {
    if (phase === "fading") {
      if (fadeOutIndex < combinedTextArray.length) {
        const timer = setTimeout(() => setFadeOutIndex((p) => p + 1), fadeInterval);
        return () => clearTimeout(timer);
      } else {
        setPhase("done");
        markAsRead();
      }
    }
  }, [phase, fadeOutIndex, combinedTextArray.length]);

  useEffect(() => {
    if (phase === "fading" && fadeOutIndex > 0) {
      const indexToFade = fadeOutIndex - 1;
      const timer = setTimeout(() => setRemovedChars((p) => [...p, String(indexToFade)]), fadeDuration);
      return () => clearTimeout(timer);
    }
  }, [phase, fadeOutIndex]);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="mb-4">
        <Link href="/" className="px-3 py-1 bg-gray-700 text-white rounded">Back</Link>
      </div>
      {phase !== "done" && (
        <div
          ref={scrollRef}
          className="text-white text-xl leading-8 whitespace-pre-wrap overflow-y-auto max-h-[80vh] w-full px-4 border border-gray-600 rounded-md content"
          style={{ padding: "16px", height: "80vh", paddingBottom: "80px" }}
        >
          {phase === "fading" ? (
            combinedTextArray.map((char, i) => {
              if (char === "\n") return <br key={i} />;
              if (removedChars.includes(String(i))) return null;
              const charFading = i < fadeOutIndex && phase === "fading";
              return (
                <span
                  key={i}
                  className="inline-block transition-opacity"
                  style={{ transitionDuration: `${fadeDuration}ms`, opacity: charFading ? 0 : 1 }}
                >
                  {char}
                </span>
              );
            })
          ) : (
            [...linesDisplay, getCurrentLinePartial() || (showCursor ? "_" : " ")].map((line, index) => (
              <div key={index}>{line}</div>
            ))
          )}
        </div>
      )}
      {phase === "done" && (
        <div className="text-white text-xl leading-8 whitespace-pre-wrap overflow-y-auto max-h-[80vh] w-full px-4  border-gray-600 rounded-md text-center">
          Best wishes to you
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <Letter />;
}
