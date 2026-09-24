# Control de Neumáticos — arquitectura modular V1

Esta versión conserva la funcionalidad validada y separa interfaz, módulos y acceso a Supabase.

## Estructura

```text
src/
├── main.jsx                    # solo arranca React
├── App.jsx                     # sesión, perfil y acceso general
├── components/
│   └── Dashboard.jsx           # menú y selección de módulos
├── lib/
│   └── supabaseClient.js       # inicialización única de Supabase
├── services/                   # funciones de acceso a datos / backend
│   ├── authService.js
│   ├── equipmentService.js
│   └── userService.js
├── modules/
│   ├── auth/
│   │   └── Login.jsx
│   ├── equipment/
│   │   ├── EquipmentPage.jsx
│   │   └── equipment.css
│   └── users/
│       ├── UsersPage.jsx
│       └── users.css
└── styles/
    └── global.css
```

## Regla de crecimiento

- `main.jsx`: no contiene lógica del negocio.
- `App.jsx`: solo sesión/perfil.
- `Dashboard.jsx`: solo navegación.
- `modules/`: cada módulo visual independiente.
- `services/`: consultas Supabase y llamadas a Edge Functions.
- `lib/`: configuración compartida.

Los siguientes módulos (`tires`, `assignments`, `history`) se agregarán como carpetas independientes siguiendo el mismo patrón.
