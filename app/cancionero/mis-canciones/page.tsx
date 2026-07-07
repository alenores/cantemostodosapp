import { redirect } from "next/navigation";

export default function MisCancionesRedirectPage() {
  redirect("/canciones/favoritas");
}
