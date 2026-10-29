const paths = {
  play: "m9 5 11 7-11 7Z",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  external: "M7 17 17 7M7 7h10v10",
  theme: "M12 3a9 9 0 1 0 0 18V3Z M12 3a9 9 0 0 1 0 18",
  file: "M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h8",
};

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
