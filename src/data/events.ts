export type Event = {
  date: string;
  name: string;
  location: string;
  ticketUrl?: string;
};

export const events: Event[] = [
  {
    date: "2 Jun",
    name: "Razzmatazz",
    location: "Barcelona",
  },
  {
    date: "20 Jun",
    name: "Por confirmar",
    location: "—",
  },
  {
    date: "5 Jul",
    name: "Festa Major",
    location: "Terrassa",
  },
  {
    date: "10 Oct",
    name: "Sala Rasa 64",
    location: "Terrassa",
    ticketUrl:
      "https://entradium.com/events/evadirse-sala-rasa-64-10-10-2026-terrassa",
  },
];
