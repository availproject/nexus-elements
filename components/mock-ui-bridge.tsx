"use client";

import React from "react";
import {
  CHAIN_METADATA,
  SUPPORTED_CHAINS,
  TOKEN_METADATA,
} from "@avail-project/nexus-core";

const uiFont = '"Geist", var(--font-geist-sans), system-ui, sans-serif';

/** Chevron down icon used in asset selector pills */
const ChevronDownIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: "12px", height: "12px", flexShrink: 0 }}
  >
    <path
      d="M2 3.5L5 6.5L8 3.5"
      stroke="#848483"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export default function MockBridgeUI() {
  return (
    <div
      style={{
        backgroundColor: "#F9F9F8",
        backgroundImage:
          "url(https://files.availproject.org/nexus-elements/nexus-one/card-bg.png)",
        backgroundPosition: "center",
        backgroundSize: "cover",
        borderRadius: "16px",
        boxShadow: "#5B5B5B0D 0px 1px 12px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        height: "fit-content",
        maxWidth: "450px",
        width: "100%",
        padding: "0",
        position: "relative",
        fontFamily: uiFont,
        textAlign: "left",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          alignItems: "center",
          boxSizing: "border-box",
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          paddingLeft: "12px",
          paddingRight: "12px",
          paddingTop: "12px",
          width: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            boxSizing: "border-box",
            color: "#161615",
            fontSize: "15px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            lineHeight: "18px",
          }}
        >
          Swap
        </div>
        <button
          style={{
            alignItems: "center",
            backgroundColor: "#FFFFFE",
            borderRadius: "8px",
            boxSizing: "border-box",
            display: "flex",
            flexShrink: 0,
            height: "32px",
            justifyContent: "center",
            outline: "1px solid #E8E8E7",
            width: "32px",
            cursor: "pointer",
            border: "none",
            padding: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "16px", height: "16px", flexShrink: 0 }}
          >
            <path
              d="M8 4V8L10.5 9.5"
              stroke="#161615"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 8C14 11.314 11.314 14 8 14C4.686 14 2 11.314 2 8C2 4.686 4.686 2 8 2C10.196 2 12.117 3.179 13.163 4.936"
              stroke="#161615"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M13.5 2V5H10.5"
              stroke="#161615"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Main content area */}
      <div
        style={{
          boxSizing: "border-box",
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: "10px",
          minHeight: 0,
          paddingInline: "12px",
          paddingBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
          }}
        >
          {/* ─── SEND PANEL ─── */}
          <div
            style={{
              alignItems: "center",
              backgroundColor: "#FFFFFE",
              borderColor: "#E8E8E7",
              borderRadius: "12px",
              borderStyle: "solid",
              borderWidth: "1px",
              boxShadow: "#1616150A 0px 1px 2px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              fontVariantNumeric: "tabular-nums",
              gap: "10px",
              justifyContent: "center",
              paddingBlock: "14px",
              paddingInline: "14px",
              width: "100%",
            }}
          >
            {/* Header row */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#848483",
                  fontSize: "12px",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  lineHeight: "20px",
                  textTransform: "uppercase",
                }}
              >
                Send
              </div>
              <button
                type="button"
                style={{
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: "6px",
                  display: "flex",
                  gap: "5px",
                  padding: "2px 0",
                  color: "#006BF4",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  lineHeight: "18px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "currentColor",
                    fontSize: "16px",
                    lineHeight: "16px",
                  }}
                >
                  +
                </span>
                Add more assets
              </button>
            </div>

            {/* Input Row */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                boxSizing: "border-box",
                display: "flex",
                gap: "8px",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <input
                  type="text"
                  value="100"
                  readOnly
                  style={{
                    boxSizing: "border-box",
                    color: "#161615",
                    fontSize: "32px",
                    fontWeight: 500,
                    lineHeight: "38px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    width: "100%",
                    minWidth: 0,
                  }}
                />
              </div>

              {/* Asset selector pill */}
              <button
                style={{
                  alignItems: "center",
                  backgroundColor: "#FFFFFE",
                  borderColor: "#E8E8E7",
                  borderRadius: "999px",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxShadow: "#1616150A 0px 1px 2px",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "7px",
                  paddingBottom: "4px",
                  paddingLeft: "4px",
                  paddingRight: "9px",
                  paddingTop: "4px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    flexShrink: 0,
                    height: "24px",
                    position: "relative",
                    width: "24px",
                  }}
                >
                  {/* Token Logo */}
                  <img
                    src={TOKEN_METADATA["USDC"].icon}
                    alt="USDC"
                    style={{
                      backgroundColor: "#FFFFFE",
                      borderRadius: "999px",
                      height: "24px",
                      objectFit: "cover",
                      width: "24px",
                    }}
                  />
                  {/* Chain Logo overlay */}
                  <img
                    src={CHAIN_METADATA[SUPPORTED_CHAINS.ARBITRUM].logo}
                    alt="Arbitrum"
                    style={{
                      backgroundColor: "#FFFFFE",
                      borderRadius: "999px",
                      height: "12px",
                      objectFit: "cover",
                      outline: "1px solid #FFFFFE",
                      width: "12px",
                      bottom: -2,
                      position: "absolute",
                      right: -2,
                    }}
                  />
                </div>
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#161615",
                    fontSize: "13px",
                    fontWeight: 500,
                    lineHeight: "17px",
                  }}
                >
                  USDC
                </div>
                <ChevronDownIcon />
              </button>
            </div>

            {/* USD balance row */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#848483",
                  fontSize: "13px",
                  lineHeight: "18px",
                }}
              >
                ≈ $100.00
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#848483",
                    fontSize: "13px",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: "18px",
                  }}
                >
                  Asset Balance · 200 USDC
                </div>
              </div>
            </div>
          </div>

          {/* ─── RECEIVE PANEL ─── */}
          <div
            style={{
              backgroundColor: "#FFFFFE",
              borderColor: "#E8E8E7",
              borderRadius: "12px",
              borderStyle: "solid",
              borderWidth: "1px",
              boxShadow: "#1616150A 0px 1px 2px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              fontVariantNumeric: "tabular-nums",
              gap: "10px",
              paddingBlock: "16px",
              paddingInline: "14px",
              width: "100%",
            }}
          >
            <div
              style={{
                alignSelf: "stretch",
                boxSizing: "border-box",
                color: "#848483",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                lineHeight: "20px",
                textTransform: "uppercase",
                width: "100%",
              }}
            >
              Receive
            </div>

            {/* Input Row */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                boxSizing: "border-box",
                display: "flex",
                gap: "10px",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <input
                  type="text"
                  value="99.9"
                  readOnly
                  style={{
                    boxSizing: "border-box",
                    color: "#161615",
                    fontSize: "32px",
                    fontWeight: 500,
                    lineHeight: "38px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: 0,
                    width: "100%",
                    minWidth: 0,
                  }}
                />
              </div>

              {/* Asset selector pill */}
              <button
                style={{
                  alignItems: "center",
                  backgroundColor: "#FFFFFE",
                  borderColor: "#E8E8E7",
                  borderRadius: "999px",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxShadow: "#1616150A 0px 1px 2px",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "7px",
                  paddingBottom: "4px",
                  paddingLeft: "4px",
                  paddingRight: "9px",
                  paddingTop: "4px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    flexShrink: 0,
                    height: "24px",
                    position: "relative",
                    width: "24px",
                  }}
                >
                  {/* Token Logo */}
                  <img
                    src={TOKEN_METADATA["USDC"].icon}
                    alt="USDC"
                    style={{
                      backgroundColor: "#FFFFFE",
                      borderRadius: "999px",
                      height: "24px",
                      objectFit: "cover",
                      width: "24px",
                    }}
                  />
                  {/* Chain Logo overlay */}
                  <img
                    src={CHAIN_METADATA[SUPPORTED_CHAINS.BASE].logo}
                    alt="Base"
                    style={{
                      backgroundColor: "#FFFFFE",
                      borderRadius: "999px",
                      height: "12px",
                      objectFit: "cover",
                      outline: "1px solid #FFFFFE",
                      width: "12px",
                      bottom: -2,
                      position: "absolute",
                      right: -2,
                    }}
                  />
                </div>
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#161615",
                    fontSize: "13px",
                    fontWeight: 500,
                    lineHeight: "17px",
                  }}
                >
                  USDC
                </div>
                <ChevronDownIcon />
              </button>
            </div>

            {/* USD balance row */}
            <div
              style={{
                alignItems: "center",
                alignSelf: "stretch",
                boxSizing: "border-box",
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#848483",
                  fontSize: "13px",
                  lineHeight: "18px",
                }}
              >
                ≈ $99.90
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#848483",
                    fontSize: "13px",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: "18px",
                  }}
                >
                  Asset Balance · 0 USDC
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            style={{
              alignItems: "center",
              backgroundColor: "#006BF4",
              border: "none",
              borderRadius: "8px",
              color: "#FFFFFE",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: "22px",
              paddingBlock: "12px",
              paddingInline: "14px",
              textAlign: "center",
              width: "100%",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
          >
            Swap
          </button>
        </div>
      </div>
    </div>
  );
}
