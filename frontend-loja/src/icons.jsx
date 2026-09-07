const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconeBusca(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  );
}

export function IconeCoracao({ preenchido = false, ...props }) {
  return (
    <svg {...base} fill={preenchido ? "currentColor" : "none"} {...props}>
      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

export function IconeSacola(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function IconeUsuario(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M5.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
    </svg>
  );
}

export function IconeMenu(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function IconeCheck(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  );
}

export function IconeSeta(props) {
  return (
    <svg {...base} width={16} height={16} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeFechar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
