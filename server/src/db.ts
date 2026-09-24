import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não definida')
  process.exit(1)
}

// Conexão somente leitura ao banco do resa-survey (role resa_map_ro em produção).
export const sql = postgres(url, {
  max: 5,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: { undefined: null },
})
