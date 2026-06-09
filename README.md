# Bora Treinar

Bora Treinar é uma plataforma fitness social para criação, execução e acompanhamento de treinos. O sistema permite que o usuário cadastre rotinas, inicie sessões de treino, acompanhe tempo de execução, registre histórico, participe de comunidades e visualize sua evolução em um painel inicial.

## Funcionalidades principais

### Frontend

- Landing page do projeto.
- Cadastro e login.
- Opção de lembrar o e-mail do usuário na tela de login.
- Dashboard pós-login.
- Página de treinos.
- Cadastro e edição de treino.
- Detalhes do treino.
- Sessão de treino com cronômetro.
- Status de treino em andamento.
- Histórico de sessões.
- Detalhes da sessão.
- Página de exercícios.
- Comunidades com criação de grupos, convites, solicitações e sala de conversa.
- Página Premium com comparação entre plano gratuito e recursos avançados.
- Perfil e configurações da conta.

### Backend/API

- Cadastro de usuário.
- Login com JWT.
- Endpoint do usuário autenticado.
- CRUD de treinos.
- Criação de sessão de treino.
- Listagem de sessões.
- Consulta de sessão por ID.
- Finalização de sessão.
- Validação de acesso protegido por token.

## Tecnologias usadas

### Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap Icons
- Armazenamento no navegador para a versão publicada do frontend

### Backend

- Java 21
- Spring Boot 3.5.14
- Spring Web
- Spring Security
- Spring Data JPA
- Bean Validation
- JWT com JJWT
- PostgreSQL
- Flyway
- Maven
- Docker Compose para banco local

## Como rodar o projeto localmente

### Requisitos

- Java 21
- Maven
- Docker Desktop
- Git
- VS Code com Live Server ou outro servidor estático local

### 1. Clonar o repositório

```bash
git clone https://github.com/lucasfaffonso/bora-treinar.git
cd bora-treinar
```

### 2. Subir o banco PostgreSQL

```bash
docker compose up -d
```

Verificar se o container está rodando:

```bash
docker compose ps
```

### 3. Rodar testes do backend

```bash
cd backend
mvn clean test
```

### 4. Gerar o JAR do backend

```bash
mvn clean package -DskipTests
```

### 5. Rodar o backend

```bash
java -jar target/bora-treinar-backend-0.0.1-SNAPSHOT.jar
```

A API ficará disponível em:

```text
http://localhost:8080/api/v1
```

### Comando rápido para iniciar o backend no Windows/PowerShell

Execute a partir de qualquer pasta, ajustando o caminho do projeto se necessário:

```powershell
cd "C:\Users\Hamilton\OneDrive\Área de Trabalho\bora-treinar"

git pull

docker compose up -d

cd backend

mvn clean package -DskipTests

Stop-Process -Name java -Force -ErrorAction SilentlyContinue

java -jar target\bora-treinar-backend-0.0.1-SNAPSHOT.jar
```

Quando aparecer `Started BoraTreinarBackendApplication` e `Tomcat started on port 8080`, o backend estará rodando.

### 6. Rodar o frontend

Abra o projeto no VS Code e execute o Live Server a partir da pasta do projeto.

URL recomendada:

```text
http://127.0.0.1:5500/frontend/pages/auth/login.html
```

## Configurações locais do banco

O backend usa as seguintes configurações padrão no ambiente local:

```text
POSTGRES_DB=bora_treinar
POSTGRES_USER=bora_user
POSTGRES_PASSWORD=bora_password_local
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
BACKEND_PORT=8080
SPRING_PROFILES_ACTIVE=dev
```

Esses valores podem ser sobrescritos por variáveis de ambiente.

## Testes rápidos da API

### Login

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"lucas.teste@example.com","password":"Senha12345"}'

$token = $response.data.accessToken
$token
```

### Usuário autenticado

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/v1/users/me" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Listar treinos

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/v1/workouts" `
  -Headers @{ Authorization = "Bearer $token" }
```

### Listar sessões de treino

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/v1/workout-sessions" `
  -Headers @{ Authorization = "Bearer $token" }
```

## Validações do frontend

Execute na raiz do projeto:

```bash
node scripts/check-frontend-routes.js
node --check frontend/assets/js/config.js
node --check frontend/assets/js/dashboard.js
node --check frontend/assets/js/workouts.js
node --check frontend/assets/js/workout-backend.js
node --check frontend/assets/js/workout-active-session.js
node --check frontend/assets/js/workout-history-backend.js
node --check frontend/assets/js/workout-session.js
node --check frontend/assets/js/workout-session-detail.js
node --check frontend/assets/js/communities-create.js
node --check frontend/assets/js/community-room.js
node --check frontend/assets/js/premium.js
node --check frontend/assets/js/settings.js
```

## Versão publicada

URL do projeto publicado:

```text
https://lucasfaffonso.github.io/bora-treinar/
```

## Observações importantes

- Algumas áreas sociais e recursos avançados ficam como evolução futura.
- Verde é usado apenas como cor semântica de sucesso/conclusão.
- A identidade visual principal usa preto, azul, roxo e branco.

## Participantes

- Lucas Fernandes Affonso
- Luis Marcelo Barbosa Rangel
- João Vitor Pereira De Macedo
- João Pedro Pereira da Silva
- Pedro Magno Martins Azevedo
- Thadeu Nascimento de Faria
