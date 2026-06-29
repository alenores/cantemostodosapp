import SalasRouteCoordinator from "@/components/salas/SalasRouteCoordinator";

export default function SalasLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <SalasRouteCoordinator>{children}</SalasRouteCoordinator>;
}
