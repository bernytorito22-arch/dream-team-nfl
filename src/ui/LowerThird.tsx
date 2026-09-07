import type { ReactNode } from "react";
import { Stars } from "./Stars";

export function LowerThird(props: {
  title: string;
  meta?: string;
  filledStars?: number;
  action?: ReactNode;
  tone?: "light" | "dark";
}) {
  const tone = props.tone ?? "light";
  return (
    <footer className={`lower tone-${tone}`}>
      <div className="lower-left">
        <h2 className="display">{props.title}</h2>
        <div className="lower-meta">
          {props.meta ? <p>{props.meta}</p> : null}
          {typeof props.filledStars === "number" ? (
            <Stars filled={props.filledStars} total={3} size={12} />
          ) : null}
        </div>
      </div>
      {props.action}
    </footer>
  );
}
