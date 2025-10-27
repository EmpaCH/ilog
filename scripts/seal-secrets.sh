#!/usr/bin/env bash
set -euo pipefail

# seals a secret using kubeseal and writes to sealed-secrets.yaml (or custom output)
# Usage examples:
# 1) Seal an existing secret in cluster:
#    ./scripts/seal-secrets.sh --from-secret my-namespace my-secret
# 2) Seal from literals (local):
#    ./scripts/seal-secrets.sh --from-literal my-secret key1=val1 key2=val2
# 3) Seal from files:
#    ./scripts/seal-secrets.sh --from-file my-secret /path/to/file1=/key1 /path/to/file2=/key2
# Options:
#   --controller-namespace  namespace where sealed-secrets controller runs (default: kube-system)
#   --controller-name       controller service name (default: sealed-secrets)
#   --output                output filename (default: sealed-secrets.yaml)

CONTROLLER_NAMESPACE="kube-system"
CONTROLLER_NAME="sealed-secrets"
OUTPUT_FILE="sealed-secrets.yaml"
MODE=""
SECRET_NAME=""
# Destination namespace for the sealed secret (affects --from-literal and --from-file modes
# and is used as the namespace when exporting an existing secret with --from-secret)
SECRET_NAMESPACE="default"

function usage() {
  cat <<EOF
Usage: $0 [options] mode args...

Modes (choose one):
  --from-secret <namespace> <secret-name>
  --from-literal <secret-name> key=val [key=val ...]
  --from-file <secret-name> <filePath=key> [filePath=key ...]

Options:
  --controller-namespace NAMESPACE   sealed-secrets controller namespace (default: kube-system)
  --controller-name NAME            sealed-secrets controller name (default: sealed-secrets)
  --namespace NAMESPACE              target namespace for the sealed secret (default: default)
  --output FILE                     output file (default: sealed-secrets.yaml)
  -h, --help                        show this help

Examples:
  $0 --from-secret my-namespace my-secret
  $0 --from-literal my-secret username=alice password=s3cr3t
  $0 --from-file my-secret ./id_rsa=ssh-key
EOF
}

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

# parse global options until a mode is encountered
while [[ $# -gt 0 ]]; do
  case "$1" in
    --controller-namespace)
      shift
      CONTROLLER_NAMESPACE="$1"
      shift
      ;;
    --controller-name)
      shift
      CONTROLLER_NAME="$1"
      shift
      ;;
    --output)
      shift
      OUTPUT_FILE="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --from-secret|--from-literal|--from-file)
      MODE="$1"
      shift
      break
      ;;
    --namespace)
      shift
      SECRET_NAMESPACE="$1"
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "$MODE" ]]; then
  echo "No mode specified. See --from-secret, --from-literal or --from-file." >&2
  usage
  exit 2
fi

# ensure kubectl and kubeseal exist
if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found in PATH" >&2
  exit 2
fi
if ! command -v kubeseal >/dev/null 2>&1; then
  echo "kubeseal not found in PATH. Install from https://github.com/bitnami-labs/sealed-secrets" >&2
  exit 2
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT
PUB_CERT_FILE="$TMP_DIR/sealed-secrets-pub.pem"

echo "Fetching Sealed Secrets controller public cert (controller: $CONTROLLER_NAME, namespace: $CONTROLLER_NAMESPACE) ..."
# kubeseal can fetch the cert directly from the controller
if kubeseal --fetch-cert --controller-name "$CONTROLLER_NAME" --controller-namespace "$CONTROLLER_NAMESPACE" >"$PUB_CERT_FILE" 2>/dev/null; then
  echo "Fetched cert to $PUB_CERT_FILE"
else
  echo "Failed to fetch cert via kubeseal. Trying to retrieve secret from cluster..."
  # try common secret name
  if kubectl get secret -n "$CONTROLLER_NAMESPACE" sealed-secrets-key >/dev/null 2>&1; then
    kubectl get secret sealed-secrets-key -n "$CONTROLLER_NAMESPACE" -o jsonpath='{.data.tls\.crt}' | base64 --decode >"$PUB_CERT_FILE"
    echo "Fetched cert from secret sealed-secrets-key"
  else
    echo "Could not fetch Sealed Secrets controller cert. Please ensure the controller is installed and reachable or provide the cert manually." >&2
    exit 3
  fi
fi

# prepare secret JSON input
SECRET_JSON_FILE="$TMP_DIR/secret.json"
case "$MODE" in
  --from-secret)
    if [[ $# -lt 2 ]]; then
      echo "Usage: --from-secret <namespace> <secret-name>" >&2
      exit 2
    fi
    SECRET_NAMESPACE="$1"
    SECRET_NAME="$2"
    echo "Exporting secret $SECRET_NAME from namespace $SECRET_NAMESPACE ..."
    kubectl get secret "$SECRET_NAME" -n "$SECRET_NAMESPACE" -o json >"$SECRET_JSON_FILE"
    ;;
  --from-literal)
    if [[ $# -lt 2 ]]; then
      echo "Usage: --from-literal <secret-name> key=val [key=val ...]" >&2
      exit 2
    fi
    SECRET_NAME="$1"
    shift
    echo "Creating secret JSON from literals for $SECRET_NAME (namespace: $SECRET_NAMESPACE) ..."
    # build kubectl create secret command with dry-run
    ARGS=(kubectl create secret generic "$SECRET_NAME" -n "$SECRET_NAMESPACE" --dry-run=client -o json)
    for kv in "$@"; do
      ARGS+=(--from-literal="$kv")
    done
    "${ARGS[@]}" >"$SECRET_JSON_FILE"
    ;;
  --from-file)
    if [[ $# -lt 2 ]]; then
      echo "Usage: --from-file <secret-name> filePath=key [filePath=key ...]" >&2
      exit 2
    fi
    SECRET_NAME="$1"
    shift
    echo "Creating secret JSON from files for $SECRET_NAME (namespace: $SECRET_NAMESPACE) ..."
    ARGS=(kubectl create secret generic "$SECRET_NAME" -n "$SECRET_NAMESPACE" --dry-run=client -o json)
    for mapping in "$@"; do
      # mapping format: /path/to/file=keyName
      ARGS+=(--from-file="$mapping")
    done
    "${ARGS[@]}" >"$SECRET_JSON_FILE"
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    exit 2
    ;;
esac

echo "Sealing secret and writing to $OUTPUT_FILE ..."
kubeseal --cert "$PUB_CERT_FILE" --format yaml <"$SECRET_JSON_FILE" >"$OUTPUT_FILE"

echo "Wrote sealed secret to $OUTPUT_FILE"

exit 0
