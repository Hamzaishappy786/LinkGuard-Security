function Card({ title, text }) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-slate-600 mt-2">{text}</p>
    </div>
  );
}
export default Card;
