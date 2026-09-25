import {
  Thermometer,
  Droplets,
  Zap,
} from "lucide-react";

export default function SensorCards({
  temperature,
  humidity,
  power,
}) {
  const cards = [
    {
      title: "Temperature",
      value: `${temperature} °C`,
      icon: <Thermometer size={32} />,
      color: "bg-red-500",
    },
    {
      title: "Humidity",
      value: `${humidity}%`,
      icon: <Droplets size={32} />,
      color: "bg-blue-500",
    },
    {
      title: "Power",
      value: `${power} W`,
      icon: <Zap size={32} />,
      color: "bg-yellow-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-xl shadow p-5 flex justify-between items-center"
        >
          <div>
            <h2 className="text-gray-500">
              {card.title}
            </h2>

            <h1 className="text-3xl font-bold mt-2">
              {card.value}
            </h1>
          </div>

          <div
            className={`${card.color} p-4 rounded-xl text-white`}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

