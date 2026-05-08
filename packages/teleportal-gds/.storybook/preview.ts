import type { Preview } from '@storybook/react-vite';

import 'govuk-frontend/dist/govuk/govuk-frontend.min.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
