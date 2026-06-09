const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const configPath = path.join(frontendDir, "assets", "js", "config.js");
const layoutPath = path.join(frontendDir, "assets", "js", "layout.js");
const indexPath = path.join(frontendDir, "index.html");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function toRouteConstant(routeKey) {
  return String(routeKey || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

function extractQuotedValues(block) {
  return Array.from(block.matchAll(/"([^"]+)"/g), function (match) {
    return match[1];
  });
}

function extractRoutes(configSource) {
  const routes = {};
  const routeRegex = /^\s*([A-Z0-9_]+):\s*`\$\{APP_FRONTEND_BASE_PATH\}\/([^`]+)`/gm;
  let match = routeRegex.exec(configSource);

  while (match) {
    routes[match[1]] = match[2];
    match = routeRegex.exec(configSource);
  }

  return routes;
}

function extractImplementedRouteKeys(configSource) {
  const match = configSource.match(/IMPLEMENTED_FRONTEND_ROUTE_KEYS:\s*\[([\s\S]*?)\]/);

  return match ? extractQuotedValues(match[1]) : [];
}

function extractImplementedNavRouteKeys(layoutSource) {
  const match = layoutSource.match(/IMPLEMENTED_NAV_ROUTE_KEYS\s*=\s*\[([\s\S]*?)\]/);

  return match ? extractQuotedValues(match[1]) : [];
}

function extractUnavailableRoutePaths(layoutSource) {
  const match = layoutSource.match(/UNAVAILABLE_ROUTE_PATHS\s*=\s*\[([\s\S]*?)\]/);

  return match ? extractQuotedValues(match[1]) : [];
}

function walkFiles(dirPath, extension, files) {
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach(function (entry) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkFiles(entryPath, extension, files);
      return;
    }

    if (entry.name.endsWith(extension)) {
      files.push(entryPath);
    }
  });
}

function normalizeFrontendPath(filePath) {
  return "/" + path.relative(frontendDir, filePath).replace(/\\/g, "/");
}

function isExternalHref(href) {
  return /^(https?:)?\/\//i.test(href) ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");
}

function resolveHref(htmlPath, href) {
  const cleanHref = href.split("#")[0].split("?")[0];

  if (!cleanHref || isExternalHref(cleanHref)) {
    return null;
  }

  if (cleanHref.startsWith("/frontend/")) {
    return path.join(rootDir, cleanHref.replace(/^\/frontend\//, "frontend/"));
  }

  if (cleanHref.startsWith("/")) {
    return path.join(frontendDir, cleanHref.replace(/^\//, ""));
  }

  return path.resolve(path.dirname(htmlPath), cleanHref);
}

const configSource = readFile(configPath);
const layoutSource = readFile(layoutPath);
const indexSource = readFile(indexPath);

const routes = extractRoutes(configSource);
const implementedRouteKeys = extractImplementedRouteKeys(configSource);
const implementedNavRouteKeys = extractImplementedNavRouteKeys(layoutSource);
const unavailableRoutePaths = extractUnavailableRoutePaths(layoutSource);
const errors = [];
const futureHiddenLinks = [];

implementedRouteKeys.forEach(function (routeKey) {
  const routePath = routes[routeKey];

  if (!routePath) {
    errors.push("Rota implementada sem entrada em APP_CONFIG.ROUTES: " + routeKey);
    return;
  }

  const absolutePath = path.join(frontendDir, routePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push("Arquivo ausente para rota implementada " + routeKey + ": frontend/" + routePath);
  }
});

implementedNavRouteKeys.forEach(function (routeKey) {
  const constantRouteKey = toRouteConstant(routeKey);

  if (!implementedRouteKeys.includes(constantRouteKey)) {
    errors.push("Item navegavel aponta para rota nao implementada: " + routeKey);
  }
});

const htmlFiles = [];
walkFiles(frontendDir, ".html", htmlFiles);

htmlFiles.forEach(function (htmlPath) {
  const source = readFile(htmlPath);
  const anchorRegex = /<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi;
  let match = anchorRegex.exec(source);

  while (match) {
    const href = match[1];
    const resolvedPath = resolveHref(htmlPath, href);

    if (!resolvedPath || !resolvedPath.endsWith(".html") || fs.existsSync(resolvedPath)) {
      match = anchorRegex.exec(source);
      continue;
    }

    const normalizedPath = normalizeFrontendPath(resolvedPath);
    const isFutureRoute = unavailableRoutePaths.some(function (routePath) {
      return normalizedPath.includes(routePath);
    });

    if (isFutureRoute) {
      futureHiddenLinks.push(normalizedPath);
    } else {
      errors.push(
        "Link HTML aponta para arquivo ausente: " +
          path.relative(rootDir, htmlPath).replace(/\\/g, "/") +
          " -> " +
          normalizedPath
      );
    }

    match = anchorRegex.exec(source);
  }
});

if (/\bStreak\b/.test(indexSource)) {
  errors.push('Landing page ainda contem o termo "Streak".');
}

if (errors.length) {
  console.error("Falha na integridade de rotas do frontend:");
  errors.forEach(function (error) {
    console.error("- " + error);
  });
  process.exit(1);
}

console.log("Integridade de rotas do frontend OK.");
console.log("Rotas implementadas verificadas: " + implementedRouteKeys.length + ".");
console.log("Itens de menu navegaveis verificados: " + implementedNavRouteKeys.length + ".");

if (futureHiddenLinks.length) {
  console.log("Links futuros ocultados em runtime: " + new Set(futureHiddenLinks).size + ".");
}
