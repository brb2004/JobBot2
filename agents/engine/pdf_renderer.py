import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel
from weasyprint import CSS, HTML

logger = logging.getLogger(__name__)


class PDFConfig(BaseModel):
    """Configuration for PDF rendering settings."""

    margin_top: str = "0.75in"
    margin_bottom: str = "0.75in"
    margin_left: str = "0.75in"
    margin_right: str = "0.75in"
    page_size: str = "Letter"


class RenderResult(BaseModel):
    """Result of the PDF rendering process."""

    output_path: Path
    success: bool
    error: Optional[str] = None


class PDFRenderer:
    """
    Engine for rendering HTML content to PDF files using WeasyPrint.
    """

    def render_pdf(
        self,
        html_content: str,
        output_path: str,
        base_url: Optional[str] = None,
        config: Optional[PDFConfig] = None,
    ) -> RenderResult:
        """
        Renders an HTML string to a PDF file.

        Args:
            html_content (str): The rendered HTML content to convert.
            output_path (str): The destination path for the PDF file.
            base_url (Optional[str]): Base URL for resolving external assets.
            config (Optional[PDFConfig]): PDF configuration for margins and page size.

        Returns:
            RenderResult: Object containing output path and success status.
        """
        try:
            out_path = Path(output_path)
            html = HTML(string=html_content, base_url=base_url)

            stylesheets = []
            if config:
                # Inject @page CSS to override defaults
                page_css = (
                    f"@page {{ "
                    f"size: {config.page_size}; "
                    f"margin-top: {config.margin_top}; "
                    f"margin-bottom: {config.margin_bottom}; "
                    f"margin-left: {config.margin_left}; "
                    f"margin-right: {config.margin_right}; "
                    f"}}"
                )
                stylesheets.append(CSS(string=page_css))

            html.write_pdf(out_path, stylesheets=stylesheets)
            return RenderResult(output_path=out_path, success=True)
        except Exception as e:
            logger.error(f"Error occurred while rendering PDF: {e}")
            return RenderResult(
                output_path=Path(output_path), success=False, error=str(e)
            )
