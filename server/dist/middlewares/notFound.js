export const notFound = (_req, res) => {
    res.status(404).json({ error: "Not found" });
};
