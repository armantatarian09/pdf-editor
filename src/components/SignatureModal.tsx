import { useEffect, useRef, useState } from "react";

type SignatureModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

const SignatureModal = ({ open, onClose, onSave }: SignatureModalProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 2;
    context.lineCap = "round";
  }, [open]);

  if (!open) return null;

  const getPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const pos = getPos(event);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const pos = getPos(event);
    context.lineTo(pos.x, pos.y);
    context.stroke();
  };

  const onPointerUp = () => setDrawing(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50
      }}
    >
      <div style={{ background: "#0b1120", padding: 16, borderRadius: 12 }}>
        <h3>Draw Signature</h3>
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          style={{ border: "1px solid #334155", borderRadius: 8, display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
