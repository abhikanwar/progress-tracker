export const errorHandler = (err, _req, res, _next) => {
    const message = err instanceof Error ? err.message : "Unexpected error";
    res.status(500).json({ error: message });
};
