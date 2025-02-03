class FileRoute {
  /**
   * @param {UseCaseEnvironment} ucEnv
   */
  acceptFile({ dtoIn }) {
    const file = dtoIn.data;

    return {
      metadata: {
        code: dtoIn.code,
        description: dtoIn.description,
        number: dtoIn.number,
        bool: dtoIn.bool,
      },
      file: {
        name: file.name,
        length: file.size,
        body: file.data.toString(),
        mimetype: "text/plain",
      },
    };
  }
}

export default new FileRoute();
