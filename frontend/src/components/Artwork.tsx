"use client";
import { useId } from "react";
export function ProductArt({
  shape = "bottle",
  color = "#cc0033",
  className = "",
  label = "CARE",
}: {
  shape?: string;
  color?: string;
  className?: string;
  label?: string;
}) {
  const key = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="0 0 220 240"
      className={"product-art " + className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={key + "body"} x1="0" x2="1">
          <stop stopColor="#e7e4e0" />
          <stop offset=".28" stopColor="#fffefa" />
          <stop offset=".75" stopColor="#f6f4ef" />
          <stop offset="1" stopColor="#dedbd7" />
        </linearGradient>
        <linearGradient id={key + "cap"} x1="0" x2="1">
          <stop stopColor={color} />
          <stop offset=".5" stopColor={color} stopOpacity=".8" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <filter id={key + "shadow"}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <ellipse
        cx="112"
        cy="219"
        rx="49"
        ry="7"
        fill="#555"
        opacity=".12"
        filter={"url(#" + key + "shadow)"}
      />
      {shape === "box" ? (
        <g>
          <path
            d="M60 55 146 50 163 64 163 207 73 211 60 198Z"
            fill={"url(#" + key + "body)"}
          />
          <path d="m146 50 17 14v143l-17-10Z" fill="#d4d0ce" />
          <path d="M60 105h86v40H60Z" fill={color} />
          <text
            x="103"
            y="130"
            fill="white"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
          >
            VORTEX
          </text>
          <text
            x="102"
            y="177"
            fill="#686064"
            textAnchor="middle"
            fontSize="10"
          >
            DEMONSTRAÇÃO
          </text>
          <text x="101" y="85" fill={color} textAnchor="middle" fontSize="10">
            FARMA
          </text>
        </g>
      ) : shape === "tube" ? (
        <g>
          <path d="M67 33h88l-9 158H76Z" fill={"url(#" + key + "body)"} />
          <path d="M67 33h88v8H67Z" fill={color} opacity=".6" />
          <rect
            x="76"
            y="190"
            width="70"
            height="24"
            rx="4"
            fill={"url(#" + key + "cap)"}
          />
          <path d="M72 95h78l-2 58H75Z" fill={color} opacity=".93" />
          <text
            x="111"
            y="121"
            textAnchor="middle"
            fill="white"
            fontSize="13"
            fontWeight="600"
          >
            vortex
          </text>
          <text
            x="111"
            y="138"
            textAnchor="middle"
            fill="white"
            fontSize="9"
            letterSpacing="3"
          >
            CARE
          </text>
          <text
            x="111"
            y="73"
            textAnchor="middle"
            fill="#686064"
            fontSize="8"
            letterSpacing="2"
          >
            DAILY RITUAL
          </text>
          <text x="111" y="175" textAnchor="middle" fill="#686064" fontSize="9">
            CUIDADO DIÁRIO
          </text>
        </g>
      ) : (
        <g>
          {shape === "dropper" ? (
            <>
              <rect
                x="94"
                y="17"
                width="34"
                height="36"
                rx="13"
                fill="#51474a"
              />
              <rect x="86" y="47" width="50" height="28" rx="5" fill={color} />
            </>
          ) : shape === "pump" ? (
            <>
              <path d="M91 37v-9h56v9h-30v23H97V37Z" fill={color} />
              <rect
                x="91"
                y="55"
                width="36"
                height="20"
                rx="4"
                fill="#e4dfd8"
              />
            </>
          ) : (
            <rect
              x="78"
              y="39"
              width="64"
              height="30"
              rx="5"
              fill={"url(#" + key + "cap)"}
            />
          )}
          <path
            d="M82 68h57q17 0 17 20v106q0 16-17 16H82q-17 0-17-16V88q0-20 17-20Z"
            fill={"url(#" + key + "body)"}
          />
          <rect
            x="65"
            y="113"
            width="91"
            height="62"
            fill={color}
            opacity=".94"
          />
          <text
            x="110"
            y="139"
            textAnchor="middle"
            fill="white"
            fontSize="14"
            fontWeight="600"
          >
            vortex
          </text>
          <text
            x="110"
            y="156"
            textAnchor="middle"
            fill="white"
            fontSize="8"
            letterSpacing="2"
          >
            {label}
          </text>
          <text
            x="110"
            y="97"
            textAnchor="middle"
            fill="#686064"
            fontSize="8"
            letterSpacing="1.5"
          >
            ESSENTIALS
          </text>
          <text x="110" y="193" textAnchor="middle" fill="#686064" fontSize="8">
            FEITO PARA CUIDAR
          </text>
        </g>
      )}
    </svg>
  );
}
export function HeroArt() {
  return (
    <div className="hero-art">
      <div className="hero-orbit orbit-one" />
      <div className="hero-orbit orbit-two" />
      <div className="art-circle" />
      <div className="hero-bottle one">
        <ProductArt shape="bottle" color="#c77d7e" />
      </div>
      <div className="hero-bottle two">
        <ProductArt shape="tube" color="#cc0033" />
      </div>
      <div className="hero-bottle three">
        <ProductArt shape="dropper" color="#ad4a72" />
      </div>
      <div className="hero-note">
        <span>✦</span> Seu ritual de cuidado
        <br />
        <strong>começa aqui.</strong>
      </div>
      <svg className="botanical" viewBox="0 0 200 250" aria-hidden="true">
        <path
          d="M40 240Q85 130 160 20M70 171Q10 120 45 82Q83 100 70 171M105 115Q91 42 130 30Q148 77 105 115M79 152Q145 153 160 100Q115 91 79 152M134 70Q173 80 186 43Q159 31 134 70"
          fill="none"
          stroke="#b88883"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
