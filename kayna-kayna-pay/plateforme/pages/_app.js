import Head from "next/head";
import "../styles/globals.css";
import { FournisseurToasts } from "../composants/Toasts";

export default function App({ Component, pageProps }) {
  return (
    <FournisseurToasts>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kayna Kayna Pay</title>
      </Head>
      <Component {...pageProps} />
    </FournisseurToasts>
  );
}
