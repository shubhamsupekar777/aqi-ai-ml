from fastapi import HTTPException, status

class ModelUnavailableException(HTTPException):
    def __init__(self, detail: str = "Trained machine learning model artifact is not available."):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)

class EntityNotFoundException(HTTPException):
    def __init__(self, entity_name: str, identifier: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} with identifier '{identifier}' was not found."
        )

class DataValidationException(HTTPException):
    def __init__(self, detail: str = "Input data validation failed."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
