import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Audio,
  Sequence
} from "remotion";
import BingoCage from "./BingoCage.jsx";
const COLORS = {
  bg: "#fffef8",
  gridStroke: "#2b2b2b",
  headerText: "#1b1b1b",
  numberText: "#111",
  freeBg: "#efefef",
  highlight: "#ffd54f",
  circleFill: "#ff6b6b"
};
const CELL = 150;
const GAP = 8;
const HEADER_BORDER = 4;
const CELL_BORDER = 3;
const BORDER_RADIUS = 12;
const Header = () => {
  const letters = ["B", "I", "N", "G", "O"];
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      style: {
        display: "flex",
        gap: GAP,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12
      },
      children: letters.map((L) => /* @__PURE__ */ jsxDEV(
        "div",
        {
          style: {
            width: CELL,
            height: CELL,
            borderRadius: BORDER_RADIUS,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            border: `${HEADER_BORDER}px solid ${COLORS.gridStroke}`,
            fontSize: 84,
            fontWeight: 800,
            color: COLORS.headerText,
            fontFamily: "Arial, Helvetica, sans-serif"
          },
          children: L
        },
        L,
        false,
        {
          fileName: "<stdin>",
          lineNumber: 48,
          columnNumber: 9
        }
      ))
    },
    void 0,
    false,
    {
      fileName: "<stdin>",
      lineNumber: 38,
      columnNumber: 5
    }
  );
};
const Cell = ({ value, highlighted, circleProgress, isHeader }) => {
  const isFree = typeof value === "string" && value.toLowerCase().includes("free");
  const borderWidth = isHeader ? HEADER_BORDER : CELL_BORDER;
  const fontSize = isHeader ? 84 : 56;
  const fontWeight = isHeader ? 900 : 700;
  const borderRadius = BORDER_RADIUS;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      style: {
        width: CELL,
        height: CELL,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `${borderWidth}px solid ${COLORS.gridStroke}`,
        background: isHeader ? "#ffffff" : isFree ? COLORS.freeBg : "#fff",
        fontSize,
        fontWeight,
        color: isHeader ? COLORS.headerText : COLORS.numberText,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
        borderRadius,
        boxShadow: isHeader ? "0 4px 10px rgba(0,0,0,0.06)" : "none"
      },
      children: [
        typeof circleProgress === "number" && circleProgress > 0 && !isHeader && /* @__PURE__ */ jsxDEV(
          "div",
          {
            style: {
              position: "absolute",
              width: Math.round(CELL * 0.7),
              height: Math.round(CELL * 0.7),
              borderRadius: 999,
              background: COLORS.circleFill,
              opacity: 0.95,
              transform: `scale(${circleProgress})`,
              transition: "none",
              zIndex: 0
            }
          },
          void 0,
          false,
          {
            fileName: "<stdin>",
            lineNumber: 106,
            columnNumber: 9
          }
        ),
        highlighted && !isFree && !isHeader && /* @__PURE__ */ jsxDEV(
          "div",
          {
            style: {
              position: "absolute",
              inset: 6,
              borderRadius: 8,
              background: COLORS.highlight,
              opacity: 0.9,
              zIndex: 0
            }
          },
          void 0,
          false,
          {
            fileName: "<stdin>",
            lineNumber: 122,
            columnNumber: 9
          }
        ),
        /* @__PURE__ */ jsxDEV("div", { style: { zIndex: 1 }, children: isFree ? "FREE" : value }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 133,
          columnNumber: 7
        })
      ]
    },
    void 0,
    true,
    {
      fileName: "<stdin>",
      lineNumber: 85,
      columnNumber: 5
    }
  );
};
const BingoCardClip = ({ match = {} }) => {
  const frame = useCurrentFrame();
  const card = match.card && (match.card.length === 6 || match.card.length === 5) ? match.card : defaultCard();
  const highlights = match.highlights || [];
  const seed = match.seed || 12345;
  const replayActions = Array.isArray(match.replayActions) ? match.replayActions : [];
  const spinWindows = Array.isArray(match.replaySpinWindows) ? match.replaySpinWindows : [];
  const replayDraws = Array.isArray(match.replayDraws) ? match.replayDraws.map((d) => ({
    ...d,
    frame: Number.isFinite(d.frame) ? d.frame : 0
  })) : [];
  const replayData = match.replayData || null;
  const drawnNumbers = replayDraws.filter((d) => frame >= d.frame).map((d) => d.number);
  const cellProgress = {};
  const needsRowShift = card.length === 5;
  replayActions.forEach((a) => {
    const r = needsRowShift ? a.r + 1 : a.r;
    const key = `${r}-${a.c}`;
    const start = a.frame;
    const end = a.frame + 14;
    const p = interpolate(frame, [start, end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
    cellProgress[key] = p;
  });
  const isSpinningNow = spinWindows.some(
    (w) => frame >= w.startFrame && frame <= w.endFrame
  );
  if (!card || card.length === 0) return null;
  const scale = interpolate(frame, [0, 12, 30], [0.86, 1.03, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const lettersRow = ["B", "I", "N", "G", "O"];
  const gridRows = card.length === 5 ? [lettersRow, ...card] : card;
  const boardWidth = CELL * 5 + GAP * 4;
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { background: COLORS.bg, justifyContent: "center", alignItems: "center" }, children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        style: {
          width: Math.max(boardWidth + 40, 980),
          padding: 20,
          borderRadius: 20,
          background: "#ffffff",
          boxShadow: "0 18px 50px rgba(0,0,0,0.12)",
          transform: `scale(${scale})`,
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ jsxDEV("div", { style: { marginBottom: 24, marginTop: -20, display: "flex", flexDirection: "row", alignItems: "center", gap: 32, justifyContent: "center" }, children: [
            /* @__PURE__ */ jsxDEV(
              BingoCage,
              {
                width: 750,
                height: 650,
                tappable: false,
                autoSpin: false,
                controlledSpin: isSpinningNow,
                spinSchedule: spinWindows,
                drawnNumbers,
                seed,
                currentFrame: frame,
                replayData
              },
              void 0,
              false,
              {
                fileName: "<stdin>",
                lineNumber: 231,
                columnNumber: 11
              }
            ),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                style: {
                  width: 260,
                  height: 550,
                  padding: 20,
                  borderRadius: 20,
                  border: "4px solid #ddd",
                  background: "#fafafa",
                  boxSizing: "border-box",
                  overflow: "hidden"
                },
                children: [
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      style: {
                        fontSize: 32,
                        fontWeight: 800,
                        marginBottom: 16,
                        textAlign: "center",
                        fontFamily: "Arial, Helvetica, sans-serif",
                        color: "#333",
                        borderBottom: "2px solid #ddd",
                        paddingBottom: 8
                      },
                      children: "Drawn"
                    },
                    void 0,
                    false,
                    {
                      fileName: "<stdin>",
                      lineNumber: 256,
                      columnNumber: 13
                    }
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      style: {
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        justifyContent: "center",
                        alignContent: "flex-start"
                      },
                      children: [
                        replayDraws.length === 0 && /* @__PURE__ */ jsxDEV("div", { style: { fontSize: 24, color: "#777", marginTop: 20 }, children: "Ready" }, void 0, false, {
                          fileName: "<stdin>",
                          lineNumber: 280,
                          columnNumber: 17
                        }),
                        replayDraws.map((d, idx) => {
                          const letters = ["B", "I", "N", "G", "O"];
                          const lIdx = Math.floor((d.number - 1) / 15);
                          const letter = letters[lIdx] || "";
                          return /* @__PURE__ */ jsxDEV(
                            "div",
                            {
                              style: {
                                width: 80,
                                height: 80,
                                borderRadius: 40,
                                border: "5px solid #2b2b2b",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "#fff",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                              },
                              children: [
                                /* @__PURE__ */ jsxDEV("div", { style: { fontSize: 32, fontWeight: 800, color: "#555", lineHeight: 1, marginTop: 4 }, children: letter }, void 0, false, {
                                  fileName: "<stdin>",
                                  lineNumber: 302,
                                  columnNumber: 20
                                }),
                                /* @__PURE__ */ jsxDEV("div", { style: { fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: -2 }, children: d.number }, void 0, false, {
                                  fileName: "<stdin>",
                                  lineNumber: 303,
                                  columnNumber: 20
                                })
                              ]
                            },
                            `${d.number}-${idx}`,
                            true,
                            {
                              fileName: "<stdin>",
                              lineNumber: 287,
                              columnNumber: 17
                            }
                          );
                        })
                      ]
                    },
                    void 0,
                    true,
                    {
                      fileName: "<stdin>",
                      lineNumber: 270,
                      columnNumber: 13
                    }
                  )
                ]
              },
              void 0,
              true,
              {
                fileName: "<stdin>",
                lineNumber: 244,
                columnNumber: 11
              }
            )
          ] }, void 0, true, {
            fileName: "<stdin>",
            lineNumber: 230,
            columnNumber: 9
          }),
          /* @__PURE__ */ jsxDEV("div", { style: { display: "flex", flexDirection: "column", alignItems: "center" }, children: /* @__PURE__ */ jsxDEV("div", { style: { display: "grid", gridTemplateColumns: `repeat(5, ${CELL}px)`, gap: GAP }, children: gridRows.map(
            (row, rIdx) => row.map((cell, cIdx) => {
              const highlighted = Array.isArray(highlights) && highlights[rIdx] && highlights[rIdx][cIdx];
              const progress = cellProgress[`${rIdx}-${cIdx}`] ?? 0;
              const isHeader = rIdx === 0 && Array.isArray(gridRows[0]) && String(gridRows[0][0]).length === 1 && gridRows[0].length === 5;
              return /* @__PURE__ */ jsxDEV(
                Cell,
                {
                  value: cell,
                  highlighted,
                  circleProgress: progress,
                  isHeader
                },
                `${rIdx}-${cIdx}`,
                false,
                {
                  fileName: "<stdin>",
                  lineNumber: 326,
                  columnNumber: 19
                }
              );
            })
          ) }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 312,
            columnNumber: 11
          }) }, void 0, false, {
            fileName: "<stdin>",
            lineNumber: 310,
            columnNumber: 9
          })
        ]
      },
      void 0,
      true,
      {
        fileName: "<stdin>",
        lineNumber: 216,
        columnNumber: 7
      }
    ),
    replayDraws.map(
      (d, idx) => d.audioUrl ? /* @__PURE__ */ jsxDEV(Sequence, { from: d.frame, children: /* @__PURE__ */ jsxDEV(Audio, { src: d.audioUrl }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 346,
        columnNumber: 13
      }) }, `${d.number}-${idx}`, false, {
        fileName: "<stdin>",
        lineNumber: 345,
        columnNumber: 11
      }) : null
    )
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 215,
    columnNumber: 5
  });
};
function defaultCard() {
  return [
    ["3", "18", "31", "47", "61"],
    ["9", "16", "29", "52", "66"],
    ["2", "20", "FREE", "57", "71"],
    ["12", "24", "39", "50", "69"],
    ["7", "23", "33", "48", "75"]
  ];
}
export {
  BingoCardClip
};
