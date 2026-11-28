import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

/**
 * Turns a viem error into one plain sentence. Contract reverts come back
 * in the contract's own words (e.g. "Only the customer can pay").
 */
export function explainError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "You rejected the request in your wallet. Nothing was sent.";
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const reason = revert.reason ?? revert.data?.errorName;
      if (reason) return `The contract refused: “${reason}”.`;
    }
    if (/insufficient funds/i.test(err.message)) return "This wallet doesn't have enough test AVAX for the amount plus network fees.";
    return err.shortMessage;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

/** The raw revert string, if any (used by tests and the demo checks). */
export function revertReason(err: unknown): string | undefined {
  if (!(err instanceof BaseError)) return undefined;
  const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
  return revert instanceof ContractFunctionRevertedError ? revert.reason : undefined;
}
