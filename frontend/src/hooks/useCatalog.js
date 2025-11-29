// src/hooks/useCatalog.js - Hook para cargar catálogos dinámicos
import { useState, useEffect } from 'react';
import { catalogsApi, adminApi } from '@/lib/api';

/**
 * Hook para cargar un catálogo específico
 * @param {string} catalogName - Nombre del catálogo (ej: 'Provider', 'ASA', 'ProcedureType')
 * @returns {object} { items, loading, error }
 */
export function useCatalog(catalogName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!catalogName) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        setError(null);

        const catalog = await catalogsApi.getByName(catalogName);

        if (isMounted) {
          setItems(catalog.items || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error loading catalog ${catalogName}:`, err);
          setError(err.message || 'Error al cargar catálogo');
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [catalogName]);

  return { items, loading, error };
}

/**
 * Hook para cargar múltiples catálogos
 * @param {Array<string>} catalogNames - Nombres de los catálogos
 * @returns {object} { catalogs, loading, error }
 */
export function useCatalogs(catalogNames = []) {
  const [catalogs, setCatalogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!catalogNames || catalogNames.length === 0) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadCatalogs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar todos los catálogos en paralelo
        const promises = catalogNames.map((name) =>
          catalogsApi.getByName(name).catch((err) => {
            console.error(`Error loading catalog ${name}:`, err);
            return { name, items: [] };
          })
        );

        const results = await Promise.all(promises);

        if (isMounted) {
          const catalogsMap = results.reduce((acc, catalog) => {
            acc[catalog.name] = catalog.items || [];
            return acc;
          }, {});

          setCatalogs(catalogsMap);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading catalogs:', err);
          setError(err.message || 'Error al cargar catálogos');
          setCatalogs({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCatalogs();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(catalogNames)]); // Usar JSON.stringify para comparación profunda

  return { catalogs, loading, error };
}

/**
 * Transforma items de catálogo al formato esperado por FilterSelect
 * @param {Array} items - Items del catálogo
 * @returns {Array} Items formateados con { value, label }
 */
export function catalogToOptions(items = []) {
  return items.map((item) => ({
    value: item.code,
    label: item.label,
  }));
}

/**
 * Hook para cargar etiologías
 * @returns {object} { items, loading, error }
 */
export function useEtiologies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadEtiologies = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await adminApi.listEtiologies({ active: 'true' });

        if (isMounted) {
          setItems(response.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading etiologies:', err);
          setError(err.message || 'Error al cargar etiologías');
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEtiologies();

    return () => {
      isMounted = false;
    };
  }, []);

  return { items, loading, error };
}

/**
 * Transforma etiologías al formato esperado por FilterSelect
 * @param {Array} items - Items de etiologías
 * @returns {Array} Items formateados con { value, label }
 */
export function etiologiesToOptions(items = []) {
  return items.map((item) => ({
    value: item.code,
    label: item.name,
  }));
}
