import app from "./app";
import config from "./src/config/env";

const startApplication = async () => {
  try {
    const port = config.port || 3310;
    app.listen(port, () => {
      console.log(`Server running on port: ${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

startApplication();
