const base = {
  background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s ease infinite',
  borderRadius: '4px',
  display: 'block',
};

export function Skeleton({ w = '100%', h = 12, sx = {} }) {
  return <div style={{ ...base, width: w, height: h, ...sx }} />;
}

export function SiteCardSkeleton() {
  return (
    <div style={{ background: '#0f172a', borderRadius: '7px', padding: '12px', border: '2px solid #1e293b', flex: '1 1 240px', minWidth: '240px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <Skeleton w={140} h={14} />
        <Skeleton w={40}  h={14} />
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            <Skeleton w={40}  h={9}  sx={{ marginBottom: '4px' }} />
            <Skeleton w="80%" h={18} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} w={38} h={18} />)}
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div style={{ background: '#0f172a', borderRadius: '6px', padding: '10px 12px', border: '1px solid #1e293b', marginBottom: '4px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Skeleton w={16} h={16} sx={{ flexShrink: 0, borderRadius: '50%' }} />
        <Skeleton w="35%" h={12} />
        <div style={{ flex: 1 }} />
        <Skeleton w={40} h={14} />
        <Skeleton w={60} h={14} />
      </div>
    </div>
  );
}

export function ChartSkeleton({ h = 240 }) {
  return <Skeleton h={h} sx={{ borderRadius: '6px' }} />;
}
