import type { LeagueTeam } from "../league/types";

const TEAM_COLORS: Record<string, string> = {
  ari: "#97233f", atl: "#a71930", bal: "#241773", buf: "#00338d",
  car: "#0085ca", chi: "#c83803", cin: "#fb4f14", cle: "#311d00",
  dal: "#003594", den: "#fb4f14", det: "#0076b6", gb: "#203731",
  hou: "#03202f", ind: "#002c5f", jax: "#006778", kc: "#e31837",
  lv: "#000000", lac: "#0080c6", lar: "#003594", mia: "#008e97",
  min: "#4f2683", ne: "#002244", no: "#d3bc8d", nyg: "#0b2265",
  nyj: "#125740", phi: "#004c54", pit: "#ffb612", sea: "#002244",
  sf: "#aa0000", tb: "#d50a0a", ten: "#0c2340", was: "#5a1414",
};

const C = 300;
const R_OUT = 268;
const RIM_MID = 284;
const RIVET_R = 284;
const HUB_R = 74;
const LABEL_R = 190;
const RIVETS = 24;

function polar(angleDeg: number, radius: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + radius * Math.cos(a), C + radius * Math.sin(a)];
}

export function Wheel(props: {
  teams: LeagueTeam[];
  spinning: boolean;
  onSpin?: () => void;
  spinDisabled?: boolean;
}) {
  const n = Math.max(props.teams.length, 1);
  const seg = 360 / n;
  const canSpin = Boolean(props.onSpin) && !props.spinning && !props.spinDisabled;

  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" />
      <div
        className="wheel"
        style={{
          transition: props.spinning ? "transform 1.6s cubic-bezier(.2,.8,.2,1)" : "none",
          transform: props.spinning ? "rotate(1040deg)" : "rotate(0deg)",
        }}
        aria-hidden={Boolean(props.onSpin)}
      >
        <svg viewBox="0 0 600 600" className="wheel-svg">
          <defs>
            <linearGradient id="rim-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8c95c" />
              <stop offset="45%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8c6a2f" />
            </linearGradient>
            <radialGradient id="hub-metal" cx="0.5" cy="0.35" r="0.9">
              <stop offset="0%" stopColor="#1a2c44" />
              <stop offset="100%" stopColor="#03070c" />
            </radialGradient>
          </defs>

          {props.teams.map((t, i) => {
            const [x0, y0] = polar(i * seg, R_OUT);
            const [x1, y1] = polar((i + 1) * seg, R_OUT);
            const large = seg > 180 ? 1 : 0;
            return (
              <path
                key={t.id}
                d={`M ${C} ${C} L ${x0} ${y0} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${x1} ${y1} Z`}
                fill={TEAM_COLORS[t.id] ?? "#333333"}
                stroke="rgba(201, 162, 39, 0.55)"
                strokeWidth={2}
              />
            );
          })}

          {props.teams.map((t, i) => {
            const m = (i + 0.5) * seg;
            const [x, y] = polar(m, LABEL_R);
            return (
              <text
                key={`${t.id}-label`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${m} ${x} ${y})`}
                className="wheel-label"
              >
                {t.abbr}
              </text>
            );
          })}

          {/* metallic rim with rivets */}
          <circle cx={C} cy={C} r={RIM_MID} fill="none" stroke="url(#rim-metal)" strokeWidth={26} />
          <circle cx={C} cy={C} r={RIM_MID - 14} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={1.5} />
          <circle cx={C} cy={C} r={RIM_MID + 14} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={1.5} />
          {Array.from({ length: RIVETS }, (_, i) => {
            const [x, y] = polar((i * 360) / RIVETS, RIVET_R);
            return (
              <g key={`rivet-${i}`}>
                <circle cx={x} cy={y} r={4.5} fill="#8c6a2f" stroke="#e8c95c" strokeWidth={0.8} />
                <circle cx={x - 1.2} cy={y - 1.2} r={1.4} fill="rgba(255,255,255,0.55)" />
              </g>
            );
          })}

          {/* hub: dark medallion with gold ring + shield */}
          <circle cx={C} cy={C} r={HUB_R} fill="url(#hub-metal)" stroke="url(#rim-metal)" strokeWidth={7} />
          <g transform={`translate(${C - 24} ${C - 32}) scale(1.2)`}>
            <path
              d="M20 2 L36 8 V26 C36 37 29 44 20 48 C11 44 4 37 4 26 V8 Z"
              fill="rgba(201,162,39,0.12)"
              stroke="#c9a227"
              strokeWidth={2.2}
            />
            <text
              x={20}
              y={31}
              textAnchor="middle"
              fill="#e8c95c"
              fontFamily="Oswald, sans-serif"
              fontWeight={700}
              fontSize={13}
              letterSpacing={1}
            >
              NFL
            </text>
          </g>
        </svg>
      </div>
      {props.onSpin ? (
        <button
          type="button"
          className="wheel-hub-spin"
          disabled={!canSpin}
          onClick={props.onSpin}
          aria-label="Spin"
        >
          Spin
        </button>
      ) : null}
    </div>
  );
}
