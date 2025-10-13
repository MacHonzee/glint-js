import { URL } from "url";

/**
 * Extended URL class that adds a useCase property.
 * The useCase property is automatically set to the pathname of the URL,
 * making it easier to identify which use case/route is being handled.
 *
 * @example
 * const uri = new Uri("http://localhost:3000/user/login?remember=true");
 * console.log(uri.useCase); // "/user/login"
 * console.log(uri.searchParams.get("remember")); // "true"
 */
class Uri extends URL {
  /** The use case identifier, derived from the pathname */
  useCase: string;

  /**
   * Creates an instance of Uri.
   * @param input - The absolute or relative URL string
   * @param base - The base URL if the input is relative
   */
  constructor(input: string | URL, base?: string | URL) {
    super(input, base);
    // The useCase property is set to the pathname of the URL
    this.useCase = this.pathname;
  }
}

export default Uri;
