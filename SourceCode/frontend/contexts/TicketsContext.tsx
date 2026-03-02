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
};

const TicketsContext = createContext<TicketsContextType | undefined>(undefined);

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
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

  return (
    <TicketsContext.Provider value={{ tickets, addTicket }}>
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
