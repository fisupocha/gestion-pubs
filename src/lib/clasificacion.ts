export type FamiliaClasificacion = {
  label: string;
  subfamilias: string[];
};

export type ClasificacionMapa = Record<
  string,
  {
    label: string;
    familias: Record<string, FamiliaClasificacion>;
  }
>;

export const CLASIFICACION_PREDETERMINADA: ClasificacionMapa = {
  mercaderia: {
    label: "Mercaderia",
    familias: {
      refrescos: {
        label: "Refrescos",
        subfamilias: ["Coca-Cola", "Pepsi", "Fanta"],
      },
      cerveza: {
        label: "Cerveza",
        subfamilias: ["Barril", "Botellin", "Lata"],
      },
      tabaco: {
        label: "Tabaco",
        subfamilias: [],
      },
    },
  },
  fijos: {
    label: "Fijos",
    familias: {
      asesoria: {
        label: "Asesoria",
        subfamilias: [],
      },
      suministros: {
        label: "Suministros",
        subfamilias: ["Luz", "Agua", "Gas"],
      },
    },
  },
  varios: {
    label: "Varios",
    familias: {
      limpieza: {
        label: "Limpieza",
        subfamilias: ["Productos", "Utillaje"],
      },
      mantenimiento: {
        label: "Mantenimiento",
        subfamilias: [],
      },
    },
  },
  extras: {
    label: "Extras",
    familias: {
      decoracion: {
        label: "Decoracion",
        subfamilias: [],
      },
      eventos: {
        label: "Eventos",
        subfamilias: [],
      },
    },
  },
  empleados: {
    label: "Empleados",
    familias: {
      uniformes: {
        label: "Uniformes",
        subfamilias: [],
      },
      formacion: {
        label: "Formacion",
        subfamilias: [],
      },
    },
  },
};

export function crearClaveClasificacion(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type TipoInput = {
  id: number;
  nombre: string;
};

type FamiliaInput = {
  id: number;
  nombre: string;
  tipoId: number;
};

type SubfamiliaInput = {
  id: number;
  nombre: string;
  familiaId: number;
};

export function construirClasificacion(
  tipos: TipoInput[],
  familias: FamiliaInput[],
  subfamilias: SubfamiliaInput[]
): ClasificacionMapa {
  if (tipos.length === 0) {
    return {};
  }

  const clasificacion: ClasificacionMapa = {};
  const tiposOrdenados = [...tipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  const familiasOrdenadas = [...familias].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
  const subfamiliasOrdenadas = [...subfamilias].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  for (const tipo of tiposOrdenados) {
    const tipoKey = crearClaveClasificacion(tipo.nombre);

    if (!tipoKey) {
      continue;
    }

    clasificacion[tipoKey] = {
      label: tipo.nombre,
      familias: {},
    };
  }

  for (const familia of familiasOrdenadas) {
    const tipo = tiposOrdenados.find((item) => item.id === familia.tipoId);

    if (!tipo) {
      continue;
    }

    const tipoKey = crearClaveClasificacion(tipo.nombre);
    const familiaKey = crearClaveClasificacion(familia.nombre);

    if (!tipoKey || !familiaKey || !clasificacion[tipoKey]) {
      continue;
    }

    clasificacion[tipoKey].familias[familiaKey] = {
      label: familia.nombre,
      subfamilias: [],
    };
  }

  for (const subfamilia of subfamiliasOrdenadas) {
    const familia = familiasOrdenadas.find((item) => item.id === subfamilia.familiaId);

    if (!familia) {
      continue;
    }

    const tipo = tiposOrdenados.find((item) => item.id === familia.tipoId);

    if (!tipo) {
      continue;
    }

    const tipoKey = crearClaveClasificacion(tipo.nombre);
    const familiaKey = crearClaveClasificacion(familia.nombre);

    if (!tipoKey || !familiaKey || !clasificacion[tipoKey]?.familias[familiaKey]) {
      continue;
    }

    clasificacion[tipoKey].familias[familiaKey].subfamilias.push(subfamilia.nombre);
  }

  return clasificacion;
}
