import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "@/components/Provider";
import { Frame } from "@/components/Frame";
export const metadata: Metadata = {
  title: "Vortex Farma · Cuidado que conecta",
  description:
    "Farmácia demonstrativa do Vortex Labs. Uma experiência conectada de compra e gestão.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Provider>
          <Frame>{children}</Frame>
        </Provider>
      </body>
    </html>
  );
}
