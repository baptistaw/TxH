'use client';

export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug - Variables de Entorno</h1>
      <pre>
        NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'UNDEFINED'}
      </pre>
      <pre>
        NEXT_PUBLIC_APP_NAME: {process.env.NEXT_PUBLIC_APP_NAME || 'UNDEFINED'}
      </pre>
      <p>Si ves UNDEFINED, el archivo .env.local no se está cargando correctamente.</p>
    </div>
  );
}
