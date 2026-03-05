import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export interface Ticket {
  id: string;
  day: string;
  title: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  location: string;
  price: string;
  image: string | null;
  imageMimeType: string | null;
  mapLocation: string;
}

type TicketsContextType = {
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => Promise<void>;
  refreshTickets: () => Promise<void>;
  removeTicketsForEvent: (eventId: string) => Promise<void>;
};

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // attempt to fetch the latest tickets from the server first
        const server = await import("../lib/ticketsApi");
        try {
          const remote = await server.getMyTickets();
          const mapped: Ticket[] = remote.map((t) => ({
            id: t.id,
            day: new Date(t.date).toLocaleDateString("en-US", { weekday: "long" }),
            title: t.title,
            dateLabel: new Date(t.date).toLocaleString(),
            dateLabelDate: new Date(t.date).toLocaleDateString(),
            dateLabelTime: new Date(t.date).toLocaleTimeString(),
            location: t.location,
            price: t.price,
            image: t.eventImage,
            imageMimeType: t.eventImageMimeType,
            mapLocation: t.location,
          }));
          setTickets(mapped);
          await SecureStore.setItemAsync("tickets", JSON.stringify(mapped));
          return;
        } catch (err: any) {
          if (err.message && err.message.toLowerCase().includes("forbidden")) {
            // user isn't allowed to see tickets (e.g. org account); treat as empty
            setTickets([]);
            await SecureStore.setItemAsync("tickets", "[]");
            return;
          }
          // if we can't reach API (not logged in etc.) fall through to local cache
          console.warn("Could not sync tickets from server", err);
        }

        const raw = await SecureStore.getItemAsync("tickets");
        if (raw) {
          setTickets(JSON.parse(raw));
        }
      } catch (err) {
        console.warn("Failed to load tickets from storage", err);
      }
    };
    load();
  }, []);

  const persist = async (newTickets: Ticket[]) => {
    setTickets(newTickets);
    try {
      await SecureStore.setItemAsync("tickets", JSON.stringify(newTickets));
    } catch (err) {
      console.warn("Failed to save tickets", err);
    }
  };

  const addTicket = async (ticket: Ticket) => {
    // avoid duplicates
    setTickets((prev) => {
      if (prev.find((t) => t.id === ticket.id)) {
        return prev;
      }
      const updated = [ticket, ...prev];
      // fire-and-forget persist
      SecureStore.setItemAsync("tickets", JSON.stringify(updated)).catch((e) =>
        console.warn("persist ticket error", e)
      );
      return updated;
    });
  };

  const refreshTickets = async () => {
    try {
      const { getMyTickets } = await import("../lib/ticketsApi");
      const remote = await getMyTickets();
      const mapped: Ticket[] = remote.map((t) => ({
        id: t.id,
        day: new Date(t.date).toLocaleDateString("en-US", { weekday: "long" }),
        title: t.title,
        dateLabel: new Date(t.date).toLocaleString(),
        dateLabelDate: new Date(t.date).toLocaleDateString(),
        dateLabelTime: new Date(t.date).toLocaleTimeString(),
        location: t.location,
        price: t.price,
        image: t.eventImage,
        imageMimeType: t.eventImageMimeType,
        mapLocation: t.location,
      }));
      setTickets(mapped);
      await SecureStore.setItemAsync("tickets", JSON.stringify(mapped));
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes("forbidden")) {
        // no tickets for this account type
        setTickets([]);
        await SecureStore.setItemAsync("tickets", "[]");
        return;
      }
      console.warn("could not refresh tickets", err);
    }
  };

  const removeTicketsForEvent = async (eventId: string) => {
    setTickets((prev) => {
      const filtered = prev.filter((t) => t.id !== eventId);
      SecureStore.setItemAsync("tickets", JSON.stringify(filtered)).catch((e) =>
        console.warn("persist ticket deletion error", e)
      );
      return filtered;
    });
  };

  return (
    <TicketsContext.Provider
      value={{ tickets, addTicket, refreshTickets, removeTicketsForEvent }}
    >
      {children}
    </TicketsContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) {
    throw new Error("useTickets must be used within a TicketsProvider");
  }
  return ctx;
}
