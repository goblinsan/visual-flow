export interface LeftToolbarProps {
  tool: string;
  setTool: (tool: string) => void;
  setIconLibraryOpen: (open: boolean) => void;
  setComponentLibraryOpen: (open: boolean) => void;
}

export function LeftToolbar({
  tool,
  setTool,
  setIconLibraryOpen,
  setComponentLibraryOpen,
}: LeftToolbarProps) {
  const toolButtons = [
    { icon: "fa-solid fa-arrow-pointer", val: "select", tooltip: "Select (V)" },
    { icon: "fa-regular fa-square", val: "rect", tooltip: "Rectangle (R)" },
    { icon: "fa-regular fa-circle", val: "ellipse", tooltip: "Ellipse (O)" },
    { icon: "fa-solid fa-draw-polygon", val: "polygon", tooltip: "Polygon (G)" },
    { icon: "fa-solid fa-minus", val: "line", tooltip: "Line (L)" },
    { icon: "fa-solid fa-bezier-curve", val: "curve", tooltip: "Curve (P)" },
    { icon: "fa-solid fa-font", val: "text", tooltip: "Text (T)" },
    { icon: "fa-regular fa-image", val: "image", tooltip: "Image (I)" },
    { icon: "fa-solid fa-icons", val: "icon", tooltip: "Icon Library" },
    { icon: "fa-solid fa-layer-group", val: "component", tooltip: "Components" },
  ];

  const handleToolClick = (val: string) => {
    if (val === 'icon') {
      setTool('icon');
      setIconLibraryOpen(true);
      return;
    }
    if (val === 'component') {
      setTool('component');
      setComponentLibraryOpen(true);
      return;
    }
    setTool(val);
  };

  return (
    <aside className="w-14 border-r border-gray-200 bg-gradient-to-b from-white to-gray-50 flex flex-col items-center py-3 gap-1 shadow-sm">
      {toolButtons.map(({ icon, val, tooltip }) => (
        <button
          key={val}
          onClick={() => handleToolClick(val)}
          title={tooltip}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
            tool === val 
              ? "text-white" 
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {tool === val && (
            <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
          )}
          <i className={`${icon} text-base relative z-10`} />
        </button>
      ))}
      <div className="flex-1" />
      <div className="flex flex-col gap-1 mb-2">
        <button
          onClick={() => setTool('zoom')}
          title="Zoom tool (click to zoom in, Alt-click to zoom out)"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
            tool === 'zoom'
              ? "text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          {tool === 'zoom' && (
            <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
          )}
          <i className="fa-solid fa-magnifying-glass text-base relative z-10" />
        </button>
        <button
          onClick={() => setTool('pan')}
          title="Pan tool (drag to pan)"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 ${
            tool === 'pan'
              ? "text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          }`}
        >
          {tool === 'pan' && (
            <span className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md" />
          )}
          <i className="fa-regular fa-hand text-base relative z-10" />
        </button>
      </div>
    </aside>
  );
}
