import type { InformeConsulta } from "@/modules/consultas/utils/informe-consulta";
import type { ResultadoDetalleMensual } from "@/modules/consultas/utils/detalle-mensual";
import {
  bloquesPdfVisibles,
  type BloquePdfConsulta,
  type VistaPdfConsulta,
} from "@/modules/consultas/utils/exportar-informe-consulta";

function euros(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function porcentaje(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function FilaImpresion({
  fondo,
  sangria,
  titulo,
  importe,
  percent,
  negativo,
  tituloColor,
  importeColor,
}: {
  fondo?: string;
  sangria: number;
  titulo: string;
  importe: string;
  percent?: string;
  negativo?: boolean;
  tituloColor: string;
  importeColor: string;
}) {
  return (
    <div
      className="fila-impresion"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 38mm 22mm",
        gap: 6,
        alignItems: "center",
        minHeight: 22,
        padding: "3px 6px",
        background: fondo,
        color: tituloColor,
      }}
    >
      <div style={{ paddingLeft: sangria, fontWeight: 700, textTransform: negativo ? "none" : undefined }}>
        {titulo}
      </div>
      <div style={{ textAlign: "right", fontWeight: 700, color: importeColor }}>{importe}</div>
      <div style={{ textAlign: "right", fontWeight: 700, color: negativo ? "#9b6d60" : "#8a6458" }}>{percent}</div>
    </div>
  );
}

function bloqueVisible(bloque: BloquePdfConsulta, index: number) {
  if (bloque.clase === "tipo") {
    return (
      <FilaImpresion
        key={index}
        fondo="#f3e7e0"
        sangria={0}
        titulo={bloque.texto}
        importe={euros(bloque.importe)}
        percent={porcentaje(bloque.porcentaje)}
        tituloColor="#6e4a40"
        importeColor="#432c26"
      />
    );
  }
  if (bloque.clase === "aviso") {
    return (
      <p key={index} className="fila-impresion" style={{ margin: 0, padding: "3px 8px", color: "#8a5144", fontSize: 10, fontWeight: 700 }}>
        {bloque.texto}
      </p>
    );
  }
  if (bloque.clase === "mes") {
    return (
      <FilaImpresion
        key={index}
        fondo="#fcf6f3"
        sangria={10}
        titulo={bloque.texto}
        importe={euros(bloque.importe)}
        percent={porcentaje(bloque.porcentaje)}
        tituloColor="#7a564c"
        importeColor="#432c26"
      />
    );
  }
  if (bloque.clase === "familia") {
    return (
      <FilaImpresion
        key={index}
        sangria={22}
        titulo={bloque.texto}
        importe={euros(bloque.importe)}
        percent={porcentaje(bloque.porcentaje)}
        tituloColor="#60453d"
        importeColor="#432c26"
      />
    );
  }
  if (bloque.clase === "fras" || bloque.clase === "abonos") {
    const negativo = bloque.clase === "abonos";
    return (
      <FilaImpresion
        key={index}
        sangria={32}
        titulo={negativo ? "Total abonos" : "Total fras"}
        importe={`${negativo ? "-" : ""}${euros(bloque.importe)}`}
        percent={`${negativo ? "-" : ""}${porcentaje(bloque.porcentaje)}`}
        negativo={negativo}
        tituloColor={negativo ? "#9b6d60" : "#8a7067"}
        importeColor={negativo ? "#8b4334" : "#6b544d"}
      />
    );
  }
  if (bloque.clase === "grupo") {
    return (
      <div key={index} className="fila-impresion" style={{ padding: "4px 8px 1px 40px", color: "#8a7067", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em" }}>
        {bloque.texto.toLocaleUpperCase("es-ES")}
      </div>
    );
  }
  return (
    <div key={index} className="fila-impresion" style={{ display: "flex", gap: 6, padding: "1px 8px 1px 46px", color: "#7d645c", fontSize: 9 }}>
      <span style={{ width: 10, borderLeft: "1px solid #e5d2cb", borderBottom: "1px solid #e5d2cb", height: 9, flex: "0 0 auto" }} />
      <span>{bloque.texto}</span>
    </div>
  );
}

export function InformeConsultaImpresion({
  informe,
  detalle,
  vista,
}: {
  informe: InformeConsulta;
  detalle: ResultadoDetalleMensual;
  vista: VistaPdfConsulta;
}) {
  const avisosDeTipo = new Set(detalle.tipos.flatMap((tipo) => tipo.avisos));
  const avisosGenerales = informe.avisos.filter((aviso) => !avisosDeTipo.has(aviso));
  const bloques = bloquesPdfVisibles(detalle, vista);

  return (
    <article className="consulta-solo-impresion">
      <style>{`
        .consulta-solo-impresion { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body, .app-shell, .app-frame, .app-main, .page-body, .page-body > * {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fffdfa !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
          }
          .app-frame { display: block !important; padding: 0 !important; gap: 0 !important; }
          .app-frame > aside { display: none !important; }
          .consulta-no-imprimir { display: none !important; }
          .consulta-solo-impresion {
            display: block !important;
            color: #402a24;
            font-family: Arial, Helvetica, sans-serif;
          }
          .consulta-solo-impresion .fila-impresion,
          .consulta-solo-impresion .aviso-impresion,
          .consulta-solo-impresion .tarjeta-impresion {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <header style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.18em", fontWeight: 800, color: "#8a6458" }}>CONSULTA DETALLE</div>
        <h1 style={{ margin: "4px 0 2px", fontSize: 22, color: "#3d2721" }}>Informe de consulta</h1>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#8a6458" }}>
          {informe.modoIvaTexto.toLocaleUpperCase("es-ES")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6, marginTop: 10, textAlign: "center" }}>
          {[
            ["LOCALES", informe.locales],
            ["DESDE", informe.desde],
            ["HASTA", informe.hasta],
            ["CAJA", euros(informe.caja)],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta} className="tarjeta-impresion" style={{ border: "1px solid #e7d5ce", borderRadius: 8, background: "#fffaf7", padding: "6px 4px" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: "#8a6458" }}>{etiqueta}</div>
              <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: "#462f28" }}>{valor}</div>
            </div>
          ))}
        </div>
      </header>

      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#8a6458", margin: "8px 0" }}>
        TIPOS, MESES Y FAMILIAS
      </div>
      {avisosGenerales.map((aviso) => (
        <p key={aviso} className="aviso-impresion" style={{ margin: "0 0 4px", color: "#8a5144", fontSize: 10, fontWeight: 700 }}>
          {aviso}
        </p>
      ))}
      <div style={{ border: "1px solid #e2cfc8" }}>{bloques.map((bloque, index) => bloqueVisible(bloque, index))}</div>

      <footer style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 14 }}>
        {[
          ["CAJA TOTAL", euros(informe.caja), false],
          ["GASTO TOTAL", euros(informe.gasto), false],
          ["%", porcentaje(informe.porcentaje), true],
        ].map(([etiqueta, valor, destacado]) => (
          <div
            key={String(etiqueta)}
            className="tarjeta-impresion"
            style={{
              textAlign: "center",
              border: `1px solid ${destacado ? "#b9796d" : "#e2cfc8"}`,
              borderRadius: 8,
              background: destacado ? "#f2d8cf" : "#fffaf7",
              padding: "8px 4px",
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.08em", color: destacado ? "#884b3d" : "#8a6458" }}>
              {etiqueta}
            </div>
            <div style={{ marginTop: 3, fontSize: 14, fontWeight: 800, color: destacado ? "#6b3022" : "#432c26" }}>{valor}</div>
          </div>
        ))}
      </footer>
    </article>
  );
}
